const crypto = require("node:crypto");

function requireAdmin(req, res, next) {
  const expected = process.env.ORDER_ADMIN_TOKEN;
  const provided = req.get("x-admin-token");

  if (!expected || !provided) {
    return res.status(401).json({ message: "Valid administrator credentials are required." });
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return res.status(401).json({ message: "Valid administrator credentials are required." });
  }

  return next();
}

module.exports = requireAdmin;
