const express = require("express");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const User = require("../models/User");
const requireUser = require("../middleware/requireUser");

const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, store: user.store || null });

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function issueSession(user, res) {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) return res.status(503).json({ message: "Authentication is not configured. Set AUTH_TOKEN_SECRET on the server." });
  const token = requireUser.sign({ sub: user._id.toString(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }, secret);
  return res.json({ token, user: publicUser(user) });
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || "") || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Enter your name, a valid email, and a password of at least 8 characters." });
    }
    const user = await User.create({ name: name.trim(), email, passwordHash: await hashPassword(password) });
    return issueSession(user, res);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    return res.status(400).json({ message: error.message || "Could not create your account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase().trim() }).select("+passwordHash");
    if (!user || !(await verifyPassword(req.body.password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    return issueSession(user, res);
  } catch {
    return res.status(400).json({ message: "Could not sign in. Please try again." });
  }
});

router.get("/me", requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

router.post("/store", requireUser, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Please enter a name for your store." });
    if (req.user.store?.name) return res.status(409).json({ message: "You already have a store." });
    req.user.store = { name: name.trim(), description: (description || "").trim(), createdAt: new Date() };
    await req.user.save();
    return res.status(201).json({ user: publicUser(req.user) });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not create your store." });
  }
});

module.exports = router;
