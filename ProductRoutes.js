
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const requireAdmin = require("../middleware/requireAdmin");
const requireUser = require("../middleware/requireUser");

// GET: Saare products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST: Naya product add karo
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, description, price, image, stock, category } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      image,
      stock,
      category,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/seller", requireUser, async (req, res) => {
  try {
    if (!req.user.store?.name) return res.status(403).json({ message: "Create your store before adding products." });
    const { name, description, price, image, stock, category } = req.body;
    const product = await Product.create({ name, description, price, image, stock, category, seller: req.user._id, storeName: req.user.store.name });
    return res.status(201).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not add this product." });
  }
});

router.get("/seller/mine", requireUser, async (req, res) => {
  if (!req.user.store?.name) return res.status(403).json({ message: "Create your store to manage products." });
  const products = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 });
  return res.json(products);
});

// PUT: Product update karo
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product nahi mila" });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE: Product delete karo
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product nahi mila" });
    }

    res.json({ message: "Product successfully delete ho gaya" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
