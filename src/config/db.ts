import mongoose from 'mongoose';

export const connectDB = async (mongoURI: string) => {
    try {
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 30000, // 30 seconds
            socketTimeoutMS: 45000, // 45 seconds
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            connectTimeoutMS: 30000,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};