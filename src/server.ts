import dotenv from 'dotenv';
// Load environment variables FIRST
dotenv.config();

import app from "./app.js";

const PORT = process.env.PORT || 5000;

// For Vercel, export the app
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}