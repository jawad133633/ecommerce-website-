const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  store: {
    name: { type: String, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    createdAt: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
