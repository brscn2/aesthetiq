import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUser {
  clerkId: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

