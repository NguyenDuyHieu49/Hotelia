    const session=await this.connection.startSession();
    let created: BookingDocument;
    try {
      await session.withTransaction(async()=>{
        const replay=await this.bookingModel.findOne({userId:objectId(userId),requestKey}).session(session);
        if(replay) {
          if(replay.requestHash!==requestHash) throw new ConflictException('Mã yêu cầu đã được dùng cho nội dung khác');
          created=replay;
          return;
        }
        const db=this.connection.db!;
        const hotel=await db.collection('hotels').findOne({_id:objectId(dto.hotelId),status:'PUBLISHED'},{session});
        if(!hotel || hotel.isDemoCatalog) throw new BadRequestException('Khách sạn chưa nhận đặt phòng');
        // Serialize reservations for this room type to prevent concurrent overselling.
        const room=await db.collection('roomtypes').findOneAndUpdate({_id:objectId(dto.roomTypeId),hotelId:hotel._id,isActive:true},{$inc:{inventoryVersion:1}},{session,returnDocument:'after'});
        if(!room) throw new BadRequestException('Loại phòng không thuộc khách sạn hoặc đã ngừng bán');
        if(dto.guestCount>room.maxGuests) throw new BadRequestException('Số khách vượt sức chứa loại phòng');
        if(!Number.isFinite(room.basePrice) || room.basePrice<=0) throw new BadRequestException('Giá phòng chưa hợp lệ');
        const overlapping=await db.collection('bookings').find({roomTypeId:room._id,checkIn:{$lt:checkOut},checkOut:{$gt:checkIn},...occupyingBookings()},{session}).toArray();
        if(freeRooms(room.totalRooms,checkIn,checkOut,overlapping as any)<1) throw new BadRequestException('Loại phòng đã hết trong thời gian đã chọn');
        [created]=await this.bookingModel.create([{
          ...dto,userId:objectId(userId),hotelId:hotel._id,roomTypeId:room._id,checkIn,checkOut,nights,
          hotelName:hotel.name,roomTypeName:room.name,roomPrice:room.basePrice,totalPrice:room.basePrice*nights,
          status:BookingStatus.PENDING_PAYMENT,holdExpiresAt:new Date(Date.now()+15*60000),requestKey,requestHash,
        }],{session});
        await db.collection('notifications').insertOne({userId:objectId(userId),title:'Đã giữ phòng',message:`${hotel.name}: vui lòng chọn phương thức thanh toán trong 15 phút.`,type:'BOOKING',relatedId:created._id,isRead:false,createdAt:new Date()},{session});
      });
    } catch(error) {
      const existing=await this.bookingModel.findOne({userId:objectId(userId),requestKey});
      if(existing) {
        if(existing.requestHash!==requestHash) throw new ConflictException('Mã yêu cầu đã được dùng cho nội dung khác');
        return this.findById(String(existing._id));
      }
      throw error;
    } finally {await session.endSession();}
    return this.findById(String(created!._id));
