const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please log in" });
  }

  try {
    req.user = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET || "upi-guardian-development-secret"
    );
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired. Please log in again.",
    });
  }
}

module.exports = requireAuth;
