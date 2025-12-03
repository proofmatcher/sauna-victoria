import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
export declare const upload: multer.Multer;
export declare const deleteCloudinaryImage: (imageUrl: string) => Promise<boolean>;
export declare const isValidImageUrl: (url: string) => boolean;
export declare const sanitizeImageUrl: (url: string) => string;
export default cloudinary;
