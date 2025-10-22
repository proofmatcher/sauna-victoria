import jwt from "jsonwebtoken";

export const generateToken = (id: string) => {
  const secret = process.env.JWT_SECRET || "fallback-secret-key";
  return jwt.sign({ id }, secret, {
    expiresIn: "7d",
  });
};

export const generateRefreshToken = (id: string) => {
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || "fallback-refresh-secret";
  return jwt.sign({ id }, refreshSecret, {
    expiresIn: "30d", // Refresh tokens last longer
  });
};

export const generateTokenPair = (id: string) => {
  return {
    accessToken: generateToken(id),
    refreshToken: generateRefreshToken(id)
  };
};