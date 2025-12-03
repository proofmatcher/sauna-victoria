import { Request, Response, NextFunction } from 'express';
import { upload } from '../config/cloudinary.js';

// Middleware to handle multer errors
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File size too large. Maximum size is 5MB.' 
      });
    }
    if (err.message) {
      return res.status(400).json({ 
        message: err.message 
      });
    }
    return res.status(400).json({ 
      message: 'Error uploading file.' 
    });
  }
  next();
};

// Single image upload middleware
export const uploadSingleImage = (fieldName: string = 'image') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (err: any) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  };
};

// Optional image upload - doesn't fail if no file is provided
export const uploadOptionalImage = (fieldName: string = 'image') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (err: any) => {
      // If there's an error and it's not because the file is missing, handle it
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  };
};
