import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole, OwnerStatus } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = new this.userModel({
      email: dto.email.toLowerCase(),
      passwordHash,
      name: dto.name,
      phone: dto.phone,
      role: UserRole.USER,
      isActive: true,
    });
    return user.save();
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user ID');
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.findById(id);
    if (dto.name) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;
    return user.save();
  }

  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new BadRequestException('Account is temporarily locked');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.loginAttempts = 0;
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return false;
    }
    if (user.loginAttempts > 0 || user.lockedUntil) {
      user.loginAttempts = 0;
      user.lockedUntil = undefined;
      user.lastLoginAt = new Date();
      await user.save();
    }
    return true;
  }

  async updateRefreshToken(userId: string, token: string | null): Promise<void> {
    const user = await this.findById(userId);
    if (token) {
      user.refreshToken = await bcrypt.hash(token, SALT_ROUNDS);
      user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      user.refreshToken = undefined;
      user.refreshTokenExpiry = undefined;
    }
    await user.save();
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user.refreshToken || !user.refreshTokenExpiry) return false;
    if (user.refreshTokenExpiry < new Date()) return false;
    return bcrypt.compare(token, user.refreshToken);
  }

  async applyAsOwner(userId: string, businessName: string, businessLicense: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (user.role !== UserRole.USER) throw new BadRequestException('Already an owner/admin');
    if (user.ownerStatus === OwnerStatus.PENDING) throw new ConflictException('Application pending');
    if (user.ownerStatus === OwnerStatus.APPROVED) throw new ConflictException('Already an owner');
    user.businessName = businessName;
    user.businessLicense = businessLicense;
    user.ownerStatus = OwnerStatus.PENDING;
    return user.save();
  }

  async approveOwner(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (user.ownerStatus !== OwnerStatus.PENDING) throw new BadRequestException('Not pending');
    user.ownerStatus = OwnerStatus.APPROVED;
    user.role = UserRole.OWNER;
    return user.save();
  }

  async rejectOwner(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (user.ownerStatus !== OwnerStatus.PENDING) throw new BadRequestException('Not pending');
    user.ownerStatus = OwnerStatus.REJECTED;
    return user.save();
  }

  async findPendingOwners(): Promise<UserDocument[]> {
    return this.userModel.find({ ownerStatus: OwnerStatus.PENDING }).sort({ createdAt: -1 });
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.findById(userId);
    await user.deleteOne();
  }
}
