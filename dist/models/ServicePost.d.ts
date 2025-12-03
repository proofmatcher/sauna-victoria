import mongoose, { Document } from "mongoose";
export interface IServicePost extends Document {
    title: string;
    excerpt: string;
    content: string;
    readTime: string;
    category: string;
    image?: string;
    featured: boolean;
    published: boolean;
    author: mongoose.Types.ObjectId;
    slug: string;
    views: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IServicePost, {}, {}, {}, mongoose.Document<unknown, {}, IServicePost, {}, {}> & IServicePost & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
