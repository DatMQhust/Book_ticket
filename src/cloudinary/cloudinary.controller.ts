// src/upload/upload.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  InternalServerErrorException,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Express } from 'express';

// Kích thước file (tính bằng byte)
const TEN_MB = 10 * 1024 * 1024;
const HUNDRED_MB = 100 * 1024 * 1024;

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Endpoint upload ảnh.
   * Chỉ chấp nhận file 'file' từ form-data.
   * Giới hạn: 10MB và chỉ file (png, jpg, jpeg, webp)
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: TEN_MB,
            message: `File quá lớn! Dung lượng tối đa cho ảnh là ${TEN_MB / (1024 * 1024)}MB`,
          }),
          new FileTypeValidator({
            fileType: '.(png|jpeg|jpg|webp|gif)',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      const result = await this.cloudinaryService.uploadImage(
        file,
        'event_booking_service',
      );

      return {
        message: 'Upload ảnh thành công!',
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi server khi upload ảnh',
      );
    }
  }

  /**
   * Endpoint upload video.
   * Giới hạn: 100MB và chỉ file (mp4, mov, avi)
   */
  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: HUNDRED_MB,
            message: `File quá lớn! Dung lượng tối đa cho video là ${HUNDRED_MB / (1024 * 1024)}MB`,
          }),
          new FileTypeValidator({
            fileType: '.(mp4|mov|avi|wmv)',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      const result = await this.cloudinaryService.uploadVideo(
        file,
        'event_booking_video',
      );

      return {
        message: 'Upload video thành công!',
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi server khi upload video',
      );
    }
  }

  /**
   * Endpoint xóa file ảnh.
   * Cần truyền ?public_id=...
   */
  @Delete('image')
  @HttpCode(HttpStatus.OK) // Trả về 200 OK
  async deleteImage(@Query('public_id') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('Vui lòng cung cấp public_id');
    }
    try {
      await this.cloudinaryService.deleteFile(publicId, 'image');
      return { message: 'Xóa ảnh thành công' };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi server khi xóa ảnh',
      );
    }
  }

  /**
   * Endpoint xóa file video.
   * Cần truyền ?public_id=...
   */
  @Delete('video')
  @HttpCode(HttpStatus.OK)
  async deleteVideo(@Query('public_id') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('Vui lòng cung cấp public_id');
    }
    try {
      await this.cloudinaryService.deleteFile(publicId, 'video');
      return { message: 'Xóa video thành công' };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi server khi xóa video',
      );
    }
  }
}
