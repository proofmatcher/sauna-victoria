import { Request, Response } from "express";
export declare const getPublishedPosts: (req: Request, res: Response) => Promise<void>;
export declare const getFeaturedPosts: (req: Request, res: Response) => Promise<void>;
export declare const getPostBySlug: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPostsByCategory: (req: Request, res: Response) => Promise<void>;
export declare const getCategories: (req: Request, res: Response) => Promise<void>;
export declare const getLatestPosts: (req: Request, res: Response) => Promise<void>;
