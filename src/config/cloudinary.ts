import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'service-posts',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [
        { width: 1200, height: 630, crop: 'limit' }, // Limit max dimensions
        { quality: 'auto:good' }, // Auto quality optimization
        { fetch_format: 'auto' } // Auto format selection
      ],
      public_id: `post-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
    };
  },
});

// File filter for image validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    // Additional validation for allowed types
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Multer upload configuration
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

// Helper function to delete image from Cloudinary
export const deleteCloudinaryImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split('/');
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    const publicId = `service-posts/${publicIdWithExtension.split('.')[0]}`;
    
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
};

// Helper function to validate image URL
export const isValidImageUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    // Check if it's a valid URL with http/https protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    // Check if URL ends with common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasImageExtension = imageExtensions.some(ext => 
      parsedUrl.pathname.toLowerCase().endsWith(ext)
    );
    // Also accept Cloudinary URLs without explicit extension
    const isCloudinaryUrl = parsedUrl.hostname.includes('cloudinary.com');
    
    return hasImageExtension || isCloudinaryUrl;
  } catch (error) {
    return false;
  }
};

// Sanitize image URL
export const sanitizeImageUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    // Return the URL without any query parameters that might cause issues
    return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
  } catch (error) {
    throw new Error('Invalid image URL format');
  }
};

export default cloudinary;
