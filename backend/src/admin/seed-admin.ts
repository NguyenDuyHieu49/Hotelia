import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole, OwnerStatus } from '../users/schemas/user.schema';

@Injectable()
export class AdminSeedService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async seedAdmin() {
    const adminEmail = 'admin@hotelia.com';

    const existingAdmin = await this.userModel.findOne({ email: adminEmail });
    if (existingAdmin) {
      return { message: 'Admin already exists', email: adminEmail };
    }

    // Simple password: Admin123!
    const passwordHash = '$2b$10$rOvHPLkQqXqQqXqXqXqXqOuJbJbJbJbJbJbJbJbJbJbJbJbJbJbJb'; // Placeholder

    const admin = new this.userModel({
      email: adminEmail,
      passwordHash: 'Admin123!',
      name: 'Administrator',
      role: UserRole.ADMIN,
      ownerStatus: OwnerStatus.APPROVED,
      isActive: true,
    });

    await admin.save();

    return { message: 'Admin created', email: adminEmail, password: 'Admin123!' };
  }
}
