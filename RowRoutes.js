
const express = require("express");
const router = express.Router();
const Row = require("../models/Rows.js");

// CREATE: Add a row
router.post("/", async (req, res) => {
  try {
    const { name, email, age } = req.body;

    const row = await Row.create({ name, email, age });

    res.status(201).json({
      success: true,
      message: "Row created successfully",
      data: row,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// READ: Get all rows
router.get("/", async (req, res) => {
  try {
    const rows = await Row.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// READ: Get one row
router.get("/:id", async (req, res) => {
  try {
    const row = await Row.findById(req.params.id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Row not found",
      });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid row ID",
    });
  }
});

// UPDATE: Edit a row
router.put("/:id", async (req, res) => {
  try {
    const row = await Row.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        email: req.body.email,
        age: req.body.age,
      },
      { new: true, runValidators: true }
    );

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Row not found",
      });
    }

    res.json({
      success: true,
      message: "Row updated successfully",
      data: row,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE: Remove a row
router.delete("/:id", async (req, res) => {
  try {
    const row = await Row.findByIdAndDelete(req.params.id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Row not found",
      });
    }

    res.json({
      success: true,
      message: "Row deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid row ID",
    });
  }
});

module.exports = router;