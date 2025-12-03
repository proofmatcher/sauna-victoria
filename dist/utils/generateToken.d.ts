export declare const generateToken: (id: string) => string;
export declare const generateRefreshToken: (id: string) => string;
export declare const generateTokenPair: (id: string) => {
    accessToken: string;
    refreshToken: string;
};
