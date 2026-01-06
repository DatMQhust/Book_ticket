import { Controller, Get, Param, Put, Req } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Get(':id/profile')
  getUserProfile(@Param('id') id: string, @Req() req) {
    if (req.user.id !== id) {
      throw new Error('Unauthorized access to user profile');
    }
    return this.usersService.getUserProfileAndActivity(id);
  }
  @Put('/:id')
  async updateUser(@Param('id') id: string, @Req() req) {
    if (req.user.id !== id) {
      throw new Error('Unauthorized access to update user');
    }
    const updateData = req.body;
    return this.usersService.updateUserProfile(id, updateData);
  }
}
