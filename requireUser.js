const crypto = require("node:crypto");
const User = require("../models/User");

function sign(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${crypto.createHmac("sha256", secret).update(encoded).digest("base64url")}`;
}

async function requireUser(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!token || !secret) return res.status(401).json({ message: "Please sign in to continue." });
  try {
    const [payload, signature] = token.split(".");
    const expected = crypto.createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error("Invalid token");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (claims.exp < Date.now()) throw new Error("Expired token");
    req.user = await User.findById(claims.sub);
    if (!req.user) throw new Error("User not found");
    return next();
  } catch {
    return res.status(401).json({ message: "Your session expired. Please sign in again." });
  }
}

requireUser.sign = sign;
module.exports = requireUser;
