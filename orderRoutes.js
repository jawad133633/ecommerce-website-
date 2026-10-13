const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/Product");
const { isEasyPaisaConfigured } = require("./paymentRoutes");
const requireAdmin = require("../middleware/requireAdmin");
const optionalUser = require("../middleware/optionalUser");
const requireUser = require("../middleware/requireUser");

const router = express.Router();
const deliveryFields = ["name", "email", "address", "city", "postalCode", "country"];

function normalizeCustomer(customer) {
  if (
    !customer ||
    deliveryFields.some((field) => typeof customer[field] !== "string")
  ) {
    return null;
  }

  const normalized = Object.fromEntries(
    deliveryFields.map((field) => [field, customer[field].trim()])
  );
  if (
    deliveryFields.some((field) => !normalized[field]) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
  ) {
    return null;
  }

  return normalized;
}

async function confirmPaidOrder(order) {
  if (order.paymentStatus === "paid") return order;
  if (order.paymentStatus !== "pending_verification") {
    const error = new Error("This order is not awaiting payment verification.");
    error.statusCode = 409;
    throw error;
  }

  const claimedOrder = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: "pending_verification" },
    { $set: { paymentStatus: "processing" } },
    { new: true }
  );
  if (!claimedOrder) {
    const error = new Error("This order is already being processed.");
    error.statusCode = 409;
    throw error;
  }

  const decremented = [];
  try {
    for (const item of claimedOrder.items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!product) {
        throw new Error(`${item.name} no longer has enough stock.`);
      }
      decremented.push(item);
    }

    claimedOrder.paymentStatus = "paid";
    await claimedOrder.save();
    return claimedOrder;
  } catch (error) {
    for (const item of decremented) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      );
    }

    claimedOrder.paymentStatus =
      error.statusCode === 409 ? "review" : "pending_verification";
    await claimedOrder.save();
    if (error.statusCode) throw error;
    const stockError = new Error(
      "The payment is verified but stock changed. This order needs manual review."
    );
    stockError.statusCode = 409;
    throw stockError;
  }
}

router.post("/", optionalUser, async (req, res) => {
  const reserved = [];

  try {
    const customer = normalizeCustomer(req.body.customer);
    const requestedItems = req.body.items;
    const paymentMethod = req.body.paymentMethod;
    const paymentReference =
      typeof req.body.paymentReference === "string"
        ? req.body.paymentReference.trim()
        : "";

    if (!customer) {
      return res.status(400).json({ message: "Delivery details are incomplete or invalid." });
    }
    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
      return res.status(400).json({ message: "Your bag is empty." });
    }
    if (!["cod", "easypaisa"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Select an available payment method." });
    }
    if (paymentMethod === "easypaisa" && !isEasyPaisaConfigured()) {
      return res.status(503).json({
        message: "Easypaisa transfer is not available yet. Select cash on delivery.",
      });
    }
    if (
      paymentMethod === "easypaisa" &&
      !/^[a-zA-Z0-9-]{6,40}$/.test(paymentReference)
    ) {
      return res.status(400).json({
        message: "Enter the Easypaisa transaction ID shown on your payment receipt.",
      });
    }

    const quantities = new Map();
    for (const item of requestedItems) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !mongoose.isValidObjectId(item.productId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return res.status(400).json({ message: "Your bag contains an invalid item." });
      }
      quantities.set(
        item.productId,
        (quantities.get(item.productId) || 0) + item.quantity
      );
    }
    if ([...quantities.values()].some((quantity) => quantity > 10)) {
      return res.status(400).json({ message: "You can order up to 10 of each watch." });
    }

    const products = await Product.find({ _id: { $in: [...quantities.keys()] } });
    if (products.length !== quantities.size) {
      return res.status(400).json({ message: "A watch in your bag is no longer available." });
    }

    const items = products.map((product) => ({
      product: product._id,
      name: product.name,
      image: product.image,
      unitAmount: Math.round(product.price),
      quantity: quantities.get(String(product._id)),
    }));
    if (items.some((item) => item.unitAmount < 1)) {
      return res.status(400).json({ message: "A watch has an invalid price." });
    }
    const totalAmount = items.reduce(
      (total, item) => total + item.unitAmount * item.quantity,
      0
    );

    if (paymentMethod === "cod") {
      for (const item of items) {
        const product = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (!product) {
          const error = new Error(`${item.name} is no longer available in that quantity.`);
          error.statusCode = 409;
          throw error;
        }
        reserved.push(item);
      }
    } else {
      for (const item of items) {
        const product = products.find(
          (entry) => String(entry._id) === String(item.product)
        );
        if (!product || product.stock < item.quantity) {
          const error = new Error(`${item.name} is no longer available in that quantity.`);
          error.statusCode = 409;
          throw error;
        }
      }
    }

    const order = await Order.create({
      user: req.user?._id || null,
      customer,
      items,
      currency: "PKR",
      totalAmount,
      paymentMethod,
      paymentReference:
        paymentMethod === "easypaisa" ? paymentReference : undefined,
      paymentStatus:
        paymentMethod === "cod" ? "pay_on_delivery" : "pending_verification",
    });

    const easypaisa = isEasyPaisaConfigured()
      ? {
          accountTitle: process.env.EASYPAISA_ACCOUNT_TITLE.trim(),
          accountNumber: process.env.EASYPAISA_ACCOUNT_NUMBER.trim(),
        }
      : null;

    return res.status(201).json({
      orderId: String(order._id),
      orderNumber: String(order._id).slice(-8).toUpperCase(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentReference: order.paymentReference,
      totalAmount: order.totalAmount,
      currency: order.currency,
      easypaisa,
    });
  } catch (error) {
    for (const item of reserved.reverse()) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      );
    }

    console.error("Order creation failed:", error.message);
    return res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? error.message : "Could not place your order. Please try again." });
  }
});

router.get("/mine", requireUser, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("items currency totalAmount paymentMethod paymentStatus createdAt");
    return res.json(orders);
  } catch {
    return res.status(500).json({ message: "Could not load your orders." });
  }
});

router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select("customer items currency totalAmount paymentMethod paymentStatus paymentReference createdAt");
    return res.json(orders);
  } catch (error) {
    console.error("Order listing failed:", error.message);
    return res.status(500).json({ message: "Could not load orders." });
  }
});

router.patch("/admin/:orderId/payment", requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) {
    return res.status(400).json({ message: "Invalid order ID." });
  }

  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (
      order.paymentMethod === "easypaisa" &&
      req.body.paymentStatus === "paid"
    ) {
      const confirmedOrder = await confirmPaidOrder(order);
      return res.json({
        orderId: String(confirmedOrder._id),
        paymentStatus: confirmedOrder.paymentStatus,
      });
    }

    if (
      order.paymentMethod === "easypaisa" &&
      req.body.paymentStatus === "rejected" &&
      order.paymentStatus === "pending_verification"
    ) {
      order.paymentStatus = "rejected";
      await order.save();
      return res.json({ orderId: String(order._id), paymentStatus: order.paymentStatus });
    }

    if (
      order.paymentMethod === "cod" &&
      req.body.paymentStatus === "paid" &&
      order.paymentStatus === "pay_on_delivery"
    ) {
      order.paymentStatus = "paid";
      await order.save();
      return res.json({ orderId: String(order._id), paymentStatus: order.paymentStatus });
    }

    return res.status(409).json({
      message: "That payment status change is not allowed for this order.",
    });
  } catch (error) {
    console.error("Order payment update failed:", error.message);
    return res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? error.message : "Could not update order payment." });
  }
});

module.exports = router;
