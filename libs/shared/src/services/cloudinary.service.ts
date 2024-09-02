import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {}
  async generateSignature(
    publicId: string,
    folder: string,
  ): Promise<{ signature: string; timestamp: number }> {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        folder,
      },
      process.env.CLD_API_SECRET,
    );
    return { signature, timestamp };
  }

  async deleteFilesFromCloudinary(publicIds: string[]) {
    try {
      const deletionPromises = publicIds.map((publicId) =>
        cloudinary.uploader.destroy(publicId),
      );
      await Promise.all(deletionPromises);
      console.log('Files successfully deleted from Cloudinary');
    } catch (error) {
      console.error('Failed to delete files from Cloudinary:', error);
    }
  }
}
