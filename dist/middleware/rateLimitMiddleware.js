const loginAttempts = {};
const passwordResetAttempts = {};
const registrationAttempts = {};
// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    Object.keys(loginAttempts).forEach(key => {
        if (loginAttempts[key] && loginAttempts[key].resetTime < now) {
            delete loginAttempts[key];
        }
    });
    Object.keys(passwordResetAttempts).forEach(key => {
        if (passwordResetAttempts[key] && passwordResetAttempts[key].resetTime < now) {
            delete passwordResetAttempts[key];
        }
    });
    Object.keys(registrationAttempts).forEach(key => {
        if (registrationAttempts[key] && registrationAttempts[key].resetTime < now) {
            delete registrationAttempts[key];
        }
    });
}, 5 * 60 * 1000);
// Generic rate limiter function
const createRateLimiter = (store, maxAttempts, windowMs, errorMessage) => {
    return (req, res, next) => {
        const key = `${req.ip}_${req.body?.email || 'no-email'}`;
        const now = Date.now();
        if (!store[key] || store[key].resetTime < now) {
            store[key] = {
                count: 1,
                resetTime: now + windowMs
            };
            return next();
        }
        if (store[key].count >= maxAttempts) {
            const remainingTime = Math.ceil((store[key].resetTime - now) / 1000);
            return res.status(429).json({
                error: "Rate limit exceeded",
                message: errorMessage,
                retryAfter: remainingTime
            });
        }
        store[key].count++;
        next();
    };
};
// Rate limiter for login attempts - 5 attempts per 15 minutes
export const loginRateLimiter = createRateLimiter(loginAttempts, 5, 15 * 60 * 1000, // 15 minutes
"Too many login attempts from this IP. Please try again after 15 minutes.");
// Rate limiter for password reset - 3 attempts per hour
export const passwordResetRateLimiter = createRateLimiter(passwordResetAttempts, 3, 60 * 60 * 1000, // 1 hour
"Too many password reset attempts. Please try again after 1 hour.");
// Rate limiter for registration - 3 registrations per hour per IP
export const registrationRateLimiter = createRateLimiter(registrationAttempts, 3, 60 * 60 * 1000, // 1 hour
"Too many registration attempts from this IP. Please try again after 1 hour.");
//# sourceMappingURL=rateLimitMiddleware.js.map