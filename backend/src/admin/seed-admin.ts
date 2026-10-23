import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole, OwnerStatus } from '../users/schemas/user.schema';

@Injectable()
export class AdminSeedService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  async seedAdmin() {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const adminPassword = this.config.get<string>('ADMIN_INITIAL_PASSWORD');

    if (!adminEmail || !adminPassword || adminPassword.length < 12) {
      throw new ServiceUnavailableException(
        'Admin bootstrap requires ADMIN_EMAIL and an ADMIN_INITIAL_PASSWORD of at least 12 characters.',
      );
    }

    const existingAdmin = await this.userModel.findOne({ email: adminEmail });
    if (existingAdmin) {
      return { message: 'Admin already exists', email: adminEmail };
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = new this.userModel({
      email: adminEmail,
      passwordHash,
      name: 'Administrator',
      role: UserRole.ADMIN,
      ownerStatus: OwnerStatus.APPROVED,
      isActive: true,
    });

    await admin.save();

    return { message: 'Admin created', email: adminEmail };
  }
}
