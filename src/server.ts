import dotenv from 'dotenv';
// Load environment variables FIRST
dotenv.config();

import app from "./app.js";

const PORT = process.env.PORT || 5000;

// For Vercel, export the app
export default app;

// Start server (for both development and self-hosted production)
// Only skip for serverless platforms like Vercel
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (!isServerless) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
}