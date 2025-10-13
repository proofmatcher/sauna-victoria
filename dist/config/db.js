import mongoose from 'mongoose';
export const connectDB = async (mongoURI) => {
    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB connected');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
//# sourceMappingURL=db.js.map