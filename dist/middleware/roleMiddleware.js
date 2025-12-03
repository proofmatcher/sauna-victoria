export const authorize = (...roles) => (req, res, next) => {
    if (!req.user)
        return res.status(401).json({ message: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    next();
};
//# sourceMappingURL=roleMiddleware.js.map