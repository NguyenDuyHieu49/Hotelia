import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>) {}

  async create(userId: string, title: string, message: string, type: NotificationType, relatedId?: string): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      userId: new Types.ObjectId(userId),
      title,
      message,
      type,
      relatedId: relatedId ? new Types.ObjectId(relatedId) : undefined,
    });
    return notification.save();
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<{ notifications: NotificationDocument[]; unread: number }> {
    const skip = (page - 1) * limit;
    const [notifications, unread] = await Promise.all([
      this.notificationModel.find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.notificationModel.countDocuments({ userId: new Types.ObjectId(userId), isRead: false }),
    ]);
    return { notifications, unread };
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });
    if (notification) {
      notification.isRead = true;
      await notification.save();
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true }
    );
  }

  async deleteOld(daysOld = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const result = await this.notificationModel.deleteMany({
      createdAt: { $lt: cutoff },
      isRead: true,
    });
    return result.deletedCount;
  }
}
