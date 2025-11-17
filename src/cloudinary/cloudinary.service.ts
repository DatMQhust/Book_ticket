// src/cloudinary/cloudinary.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { Express } from 'express';
const streamifier = require('streamifier');

// Định nghĩa kiểu trả về
export type CloudinaryUploadResponse =
  | UploadApiResponse
  | UploadApiErrorResponse;

@Injectable()
export class CloudinaryService {
  /**
   * Phương thức chung để upload file (được dùng nội bộ)
   * @param file Đối tượng file Multer
   * @param options Các tùy chọn upload của Cloudinary (ví dụ: folder, resource_type)
   * @returns Promise chứa thông tin response từ Cloudinary
   */
  private uploadStream(
    file: Express.Multer.File,
    options: any,
  ): Promise<CloudinaryUploadResponse> {
    return new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                error.message || 'Lỗi không xác định khi upload file',
              ),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Upload file ảnh lên Cloudinary
   * @param file File ảnh
   * @param folder Tên thư mục trên Cloudinary (ví dụ: 'products')
   * @returns
   */
  async uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<CloudinaryUploadResponse> {
    if (!file) {
      throw new InternalServerErrorException('Không có file nào được cung cấp');
    }

    const options = {
      folder: folder || 'default-images',
      resource_type: 'image',
    };

    return this.uploadStream(file, options);
  }

  /**
   * Upload file video lên Cloudinary
   * @param file File video
   * @param folder Tên thư mục trên Cloudinary (ví dụ: 'tutorials')
   * @returns
   */
  async uploadVideo(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<CloudinaryUploadResponse> {
    if (!file) {
      throw new InternalServerErrorException('Không có file nào được cung cấp');
    }

    const options = {
      folder: folder || 'default-videos',
      resource_type: 'video',
    };

    return this.uploadStream(file, options);
  }

  /**
   * Xóa file khỏi Cloudinary
   * @param public_id ID của file trên Cloudinary
   * @param resource_type Loại tài nguyên ('image', 'video', 'raw')
   * @returns
   */
  async deleteFile(
    public_id: string,
    resource_type: 'image' | 'video' | 'raw' = 'image',
  ): Promise<{ result: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        public_id,
        {
          resource_type: resource_type,
        },
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                error.message || 'Lỗi khi xóa file',
              ),
            );
          }
          resolve(result);
        },
      );
    });
  }
}
