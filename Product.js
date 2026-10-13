
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name required hai"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price required hai"],
      min: [0, "Price negative nahi ho sakti"],
      validate: {
        validator: Number.isInteger,
        message: "PKR price whole rupees mein hona chahiye",
      },
    },
    image: {
      type: String,
      default: "",
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock negative nahi ho sakta"],
      validate: {
        validator: Number.isInteger,
        message: "Stock whole number hona chahiye",
      },
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    compareAtPrice: { type: Number, min: 0, default: null },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    storeName: { type: String, default: "Good Market Finds", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
