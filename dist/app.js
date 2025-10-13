import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
dotenv.config();
// Connect to database
connectDB(process.env.MONGO_URI || "mongodb://localhost:27017/sauna");
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
export default app;
//# sourceMappingURL=app.js.map