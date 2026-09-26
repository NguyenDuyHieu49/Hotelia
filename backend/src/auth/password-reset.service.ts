import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
export class ForgotPasswordDto { @IsEmail() email:string; }
export class ResetPasswordDto {
  @IsString() @MinLength(20) @MaxLength(100) code:string;
  @IsString() @MinLength(8) @MaxLength(72) password:string;
}
@Injectable()
export class PasswordResetService {
  constructor(@InjectConnection() private connection:Connection, private config:ConfigService) {}
  async request(email:string) {
    const endpoint=this.config.get<string>('RESET_EMAIL_WEBHOOK_URL');
    const secret=this.config.get<string>('RESET_EMAIL_WEBHOOK_TOKEN');
    if(!endpoint || !secret || !endpoint.startsWith('https://')) throw new ServiceUnavailableException('Chưa cấu hình dịch vụ gửi email khôi phục mật khẩu. Vui lòng liên hệ người quản lý hệ thống.');
    const db=this.connection.db!;
    const user=await db.collection('users').findOne({email:email.trim().toLowerCase(),isActive:true});
    const result={message:'Nếu email đã đăng ký, mã khôi phục sẽ được gửi và có hiệu lực trong 15 phút.'};
    if(!user) return result;
    const resets=db.collection('password_resets');
    if(await resets.findOne({userId:user._id,createdAt:{$gt:new Date(Date.now()-60000)}})) return result;
    const code=randomBytes(24).toString('base64url');
    const tokenHash=createHash('sha256').update(code).digest('hex');
    await resets.updateOne({userId:user._id},{$set:{tokenHash,createdAt:new Date(),expiresAt:new Date(Date.now()+15*60000)}},{upsert:true});
    try {
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${secret}`},body:JSON.stringify({to:user.email,subject:'Hotelia — Khôi phục mật khẩu',text:`Mã khôi phục: ${code}\nMã có hiệu lực 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`}),signal:AbortSignal.timeout(10000)});
      if(!response.ok) throw new Error('Delivery failed');
    } catch {
      await resets.deleteOne({userId:user._id,tokenHash});
      throw new ServiceUnavailableException('Dịch vụ email hiện không khả dụng. Vui lòng thử lại sau.');
    }
    return result;
  }
  async reset(dto:ResetPasswordDto) {
    const tokenHash=createHash('sha256').update(dto.code.trim()).digest('hex');
    const passwordHash=await bcrypt.hash(dto.password,12);
    const session=await this.connection.startSession();
    try {
      await session.withTransaction(async()=>{
        const db=this.connection.db!;
        const reset=await db.collection('password_resets').findOneAndDelete({tokenHash,expiresAt:{$gt:new Date()}},{session});
        if(!reset) throw new BadRequestException('Mã khôi phục không hợp lệ hoặc đã hết hạn');
        const updated=await db.collection('users').updateOne({_id:reset.userId,isActive:true},{$set:{passwordHash,passwordChangedAt:new Date()},$inc:{tokenVersion:1},$unset:{refreshToken:'',refreshTokenExpiry:''}},{session});
        if(!updated.matchedCount) throw new BadRequestException('Tài khoản không khả dụng');
      });
    } finally {await session.endSession();}
    return {message:'Đã đặt lại mật khẩu. Bạn có thể đăng nhập.'};
  }
}
