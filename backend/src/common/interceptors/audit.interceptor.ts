import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { mergeMap } from 'rxjs/operators';
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@InjectConnection() private connection:Connection) {}
  intercept(context:ExecutionContext,next:CallHandler) {
    const req=context.switchToHttp().getRequest();
    if(!req.user || !['POST','PUT','DELETE','PATCH'].includes(req.method) || req.path.includes('/auth/')) return next.handle();
    return next.handle().pipe(mergeMap(async response=>{
      try {
        await this.connection.db!.collection('audit_logs').insertOne({actorId:req.user.sub,role:req.user.role,method:req.method,path:req.path,createdAt:new Date()});
      } catch {Logger.warn('Could not persist audit entry','AuditInterceptor');}
      return response;
    }));
  }
}
