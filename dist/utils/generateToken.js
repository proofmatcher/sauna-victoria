import jwt from "jsonwebtoken";
export const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || "fallback-secret-key";
    return jwt.sign({ id }, secret, {
        expiresIn: "7d",
    });
};
//# sourceMappingURL=generateToken.js.map