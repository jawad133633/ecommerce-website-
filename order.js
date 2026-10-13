const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    unitAmount: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item.",
      },
    },
    currency: { type: String, required: true, default: "PKR" },
    totalAmount: { type: Number, required: true, min: 1 },
    paymentMethod: {
      type: String,
      enum: ["cod", "easypaisa"],
      required: true,
    },
    paymentReference: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: [
        "pending_verification",
        "pay_on_delivery",
        "processing",
        "paid",
        "rejected",
        "review",
      ],
      default: "pending_verification",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
