import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  /**
   * Persist a remote image (e.g. an ephemeral DALL·E URL that expires in ~1h)
   * into permanent Cloudinary storage and return the durable secure URL.
   * Best-effort: if Cloudinary is unconfigured or the fetch fails, the original
   * URL is returned so the caller still has a (short-lived) usable image rather
   * than an error.
   */
  async persistRemoteImage(remoteUrl: string, folder = 'mvplab_marketplace/designs'): Promise<string> {
    if (!remoteUrl) return remoteUrl;
    try {
      const result = await cloudinary.uploader.upload(remoteUrl, {
        folder,
        resource_type: 'image',
      });
      return result.secure_url || remoteUrl;
    } catch (error) {
      this.logger.warn(
        `Failed to persist remote image to Cloudinary; falling back to source URL: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return remoteUrl;
    }
  }
  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (!file) {
      throw new BadRequestException('File is missing');
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'mvplab_marketplace',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload returned no result'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(upload);
    });
  }
}
