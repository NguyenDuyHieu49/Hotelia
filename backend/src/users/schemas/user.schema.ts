import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole { USER = 'USER', OWNER = 'OWNER', ADMIN = 'ADMIN' }
export enum OwnerStatus { PENDING = 'PENDING', APPROVED = 'APPROVED', REJECTED = 'REJECTED' }

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: String, enum: OwnerStatus })
  ownerStatus?: OwnerStatus;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  loginAttempts: number;

  @Prop()
  lockedUntil?: Date;

  @Prop()
  businessName?: string;

  @Prop()
  businessLicense?: string;

  @Prop()
  refreshToken?: string;

  @Prop()
  refreshTokenExpiry?: Date;
}

export type UserDocument = User;
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, ownerStatus: 1 });
