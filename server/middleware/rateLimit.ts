import rateLimit from "express-rate-limit";

/**
 * Strict limiter for the brute-forceable auth endpoints (login, refresh).
 * Caps repeated attempts from a single IP so credential-stuffing / password
 * guessing is throttled to a handful of tries per window.
 *
 * NOTE: requires `app.set("trust proxy", 1)` in index.ts so the real client IP
 * is read from X-Forwarded-For behind Railway's proxy — without it every request
 * looks like one IP and all users would share a single limit.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // max attempts per IP per window
  standardHeaders: true, // expose RateLimit-* headers
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});
