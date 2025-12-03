import { upload } from '../config/cloudinary.js';
// Middleware to handle multer errors
export const handleUploadError = (err, req, res, next) => {
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
export const uploadSingleImage = (fieldName = 'image') => {
    return (req, res, next) => {
        const uploadSingle = upload.single(fieldName);
        uploadSingle(req, res, (err) => {
            if (err) {
                return handleUploadError(err, req, res, next);
            }
            next();
        });
    };
};
// Optional image upload - doesn't fail if no file is provided
export const uploadOptionalImage = (fieldName = 'image') => {
    return (req, res, next) => {
        const uploadSingle = upload.single(fieldName);
        uploadSingle(req, res, (err) => {
            // If there's an error and it's not because the file is missing, handle it
            if (err) {
                return handleUploadError(err, req, res, next);
            }
            next();
        });
    };
};
//# sourceMappingURL=uploadMiddleware.js.map