import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// ─── Upload directories ───────────────────────────────────────────────
const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads', 'service-posts');
const ORIGINALS_DIR = path.join(UPLOAD_BASE, 'originals');
const PROCESSED_DIR = path.join(UPLOAD_BASE, 'processed');

// Ensure directories exist
[ORIGINALS_DIR, PROCESSED_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─── Multer disk storage ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ORIGINALS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueId = `post-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uniqueId}${ext}`);
  },
});

// File filter for image validation
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image type. Only JPEG, PNG, WebP, and GIF are allowed.'));
  }
};

// Multer upload instance (drop-in replacement for Cloudinary upload)
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

// ─── Responsive variant definitions ──────────────────────────────────
interface ImageVariants {
  mobile: string;
  tablet: string;
  desktop: string;
}

interface ProcessedImage {
  image: string;          // URL path to the desktop (largest) variant
  imageVariants: ImageVariants;
}

const VARIANTS = [
  { name: 'mobile',  width: 400,  quality: 75 },
  { name: 'tablet',  width: 800,  quality: 80 },
  { name: 'desktop', width: 1200, quality: 85 },
] as const;

/**
 * Process an uploaded image with sharp:
 * - Creates 3 responsive WebP variants (400px, 800px, 1200px)
 * - Strips EXIF metadata
 * - Deletes the original upload after processing
 * 
 * @param filePath Absolute path to the uploaded original file
 * @param slug SEO-friendly slug from the post title (e.g. "performance-testing")
 * @returns Object with image URL and variant URLs (relative paths for serving)
 */
export const processUploadedImage = async (filePath: string, slug: string): Promise<ProcessedImage> => {
  // Use slug for SEO-friendly filenames, with a short hash for uniqueness/cache-busting
  const shortHash = Math.random().toString(36).substring(2, 6);
  const basename = `${slug}-${shortHash}`;
  const variants: Record<string, string> = {};

  for (const variant of VARIANTS) {
    const outputFilename = `${basename}-${variant.name}.webp`;
    const outputPath = path.join(PROCESSED_DIR, outputFilename);

    await sharp(filePath)
      .resize(variant.width, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: variant.quality })
      .rotate() // Auto-orient based on EXIF then strip
      .toFile(outputPath);

    // Store as URL path (relative to server root)
    variants[variant.name] = `/uploads/service-posts/processed/${outputFilename}`;
  }

  // Delete original upload to save disk space
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Warning: Could not delete original upload:', err);
  }

  return {
    image: variants.desktop,  // Main/largest image
    imageVariants: {
      mobile: variants.mobile,
      tablet: variants.tablet,
      desktop: variants.desktop,
    },
  };
};

/**
 * Delete all image files associated with a service post.
 * Handles both self-hosted paths and gracefully skips Cloudinary URLs.
 */
export const deleteImageFiles = (
  imagePath: string | null | undefined,
  imageVariants?: ImageVariants | null
): void => {
  if (!imagePath) return;

  // Skip Cloudinary URLs (legacy data)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return;
  }

  // Collect all file paths to delete
  const pathsToDelete: string[] = [imagePath];

  if (imageVariants) {
    Object.values(imageVariants).forEach((variantPath) => {
      if (variantPath && !variantPath.startsWith('http')) {
        pathsToDelete.push(variantPath);
      }
    });
  }

  // Remove duplicates (desktop = image) and delete
  const uniquePaths = [...new Set(pathsToDelete)];
  for (const urlPath of uniquePaths) {
    try {
      // Convert URL path to filesystem path
      const fsPath = path.join(process.cwd(), urlPath);
      if (fs.existsSync(fsPath)) {
        fs.unlinkSync(fsPath);
      }
    } catch (err) {
      console.error(`Warning: Could not delete image file ${urlPath}:`, err);
    }
  }
};

// ─── URL validation helpers (moved from cloudinary.ts) ───────────────

/** Validate that a string is a valid image URL */
export const isValidImageUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasImageExtension = imageExtensions.some((ext) =>
      parsedUrl.pathname.toLowerCase().endsWith(ext)
    );
    return hasImageExtension;
  } catch {
    return false;
  }
};

/** Strip query parameters from an image URL */
export const sanitizeImageUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
  } catch {
    throw new Error('Invalid image URL format');
  }
};
