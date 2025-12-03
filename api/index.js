// Vercel serverless function entry point
import dotenv from 'dotenv';
dotenv.config();

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Handle ES modules for the compiled TypeScript
async function loadApp() {
  try {
    // Dynamic import for ES modules
    const appModule = await import('../dist/app.js');
    return appModule.default;
  } catch (error) {
    console.error('Failed to load app:', error);
    
    // Fallback Express app
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Sauna Booking API - Fallback Mode',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    });
    
    return app;
  }
}

let appInstance = null;

export default async (req, res) => {
  if (!appInstance) {
    appInstance = await loadApp();
  }
  return appInstance(req, res);
};