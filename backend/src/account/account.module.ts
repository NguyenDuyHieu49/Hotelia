import { Module, Controller, Injectable, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { IsString, MinLength, MaxLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';

export class PasswordDto {
  @IsString() @MinLength(1) @MaxLength(72) currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(72) newPassword: string;
}
export class SupportDto {
  @IsString() @MinLength(3) @MaxLength(160) subject: string;
  @IsString() @MinLength(10) @MaxLength(4000) message: string;
}
export class SupportReplyDto {
  @IsString() @MinLength(2) @MaxLength(4000) reply: string;
}
export function objectId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
  return new Types.ObjectId(id);
}
@Injectable()
export class AccountService {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async favorites(userId: string) {
    const db=this.connection.db!;
    const saved=await db.collection('favorites').find({userId:objectId(userId)}).sort({createdAt:-1}).toArray();
    const hotels=await db.collection('hotels').find({_id:{$in:saved.map(s=>s.hotelId)},status:'PUBLISHED'}).toArray();
    return saved.flatMap(s=>hotels.filter(h=>String(h._id)===String(s.hotelId)));
  }
  async saveFavorite(userId: string, hotelId: string) {
    const db=this.connection.db!;
    if(!await db.collection('hotels').findOne({_id:objectId(hotelId),status:'PUBLISHED'})) throw new NotFoundException('Hotel not found');
    await db.collection('favorites').updateOne({_id:`${userId}:${hotelId}` as any},{$setOnInsert:{userId:objectId(userId),hotelId:objectId(hotelId),createdAt:new Date()}},{upsert:true});
    return {saved:true};
  }
  async removeFavorite(userId:string,hotelId:string) {
    objectId(hotelId);
    await this.connection.db!.collection('favorites').deleteOne({_id:`${userId}:${hotelId}` as any});
    return {saved:false};
  }
  async password(userId:string,dto:PasswordDto) {
    const users=this.connection.db!.collection('users');
    const user=await users.findOne({_id:objectId(userId),isActive:true});
    if(!user || !await bcrypt.compare(dto.currentPassword,user.passwordHash)) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if(dto.currentPassword===dto.newPassword) throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    const result=await users.updateOne({_id:user._id,passwordHash:user.passwordHash},{$set:{passwordHash:await bcrypt.hash(dto.newPassword,12),passwordChangedAt:new Date()},$inc:{tokenVersion:1},$unset:{refreshToken:'',refreshTokenExpiry:''}});
    if(!result.modifiedCount) throw new BadRequestException('Thông tin đã thay đổi. Vui lòng thử lại');
    return {message:'Đã đổi mật khẩu. Vui lòng đăng nhập lại.'};
  }
  async tickets(userId:string) {return this.connection.db!.collection('support_tickets').find({userId:objectId(userId)}).sort({createdAt:-1}).limit(100).toArray();}
  async createTicket(userId:string,dto:SupportDto) {
    const ticket={userId:objectId(userId),subject:dto.subject.trim(),message:dto.message.trim(),status:'OPEN',createdAt:new Date()};
    if(ticket.subject.length<3 || ticket.message.length<10) throw new BadRequestException('Nội dung quá ngắn');
    const r=await this.connection.db!.collection('support_tickets').insertOne(ticket);
    return {...ticket,_id:r.insertedId};
  }
  async allTickets() {return this.connection.db!.collection('support_tickets').find().sort({createdAt:-1}).limit(200).toArray();}
  async reply(id:string,dto:SupportReplyDto) {
    const result=await this.connection.db!.collection('support_tickets').findOneAndUpdate({_id:objectId(id)},{$set:{reply:dto.reply.trim(),status:'RESOLVED',repliedAt:new Date()}},{returnDocument:'after'});
    if(!result) throw new NotFoundException('Ticket not found');
    return result;
  }
}
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly service:AccountService) {}
  @Get('favorites') favorites(@CurrentUser('sub') user:string) {return this.service.favorites(user);}
  @Put('favorites/:id') save(@CurrentUser('sub') user:string,@Param('id') id:string) {return this.service.saveFavorite(user,id);}
  @Delete('favorites/:id') remove(@CurrentUser('sub') user:string,@Param('id') id:string) {return this.service.removeFavorite(user,id);}
  @Post('password') password(@CurrentUser('sub') user:string,@Body() dto:PasswordDto) {return this.service.password(user,dto);}
  @Get('support') tickets(@CurrentUser('sub') user:string) {return this.service.tickets(user);}
  @Post('support') ticket(@CurrentUser('sub') user:string,@Body() dto:SupportDto) {return this.service.createTicket(user,dto);}
  @Get('support/all') @UseGuards(RolesGuard) @Roles(Role.ADMIN) all() {return this.service.allTickets();}
  @Post('support/:id/reply') @UseGuards(RolesGuard) @Roles(Role.ADMIN) reply(@Param('id') id:string,@Body() dto:SupportReplyDto) {return this.service.reply(id,dto);}
}
@Module({controllers:[AccountController],providers:[AccountService]})
export class AccountModule {}
