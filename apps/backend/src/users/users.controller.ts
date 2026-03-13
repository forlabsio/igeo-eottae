import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req) {
    return req.user;
  }

  @Get('me/services')
  getMyServices(@Request() req) {
    return this.usersService.getMyServices(req.user.id);
  }

  @Get('me/likes')
  getMyLikes(@Request() req) {
    return this.usersService.getMyLikes(req.user.id);
  }

  @Get('me/bookmarks')
  getMyBookmarks(@Request() req) {
    return this.usersService.getMyBookmarks(req.user.id);
  }
}
