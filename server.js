
const express = require("express");
const mongoose = require("mongoose");
const path = require("node:path");
const rowRoutes = require("./Routes/RowRoutes.js");
const productRoutes = require("./Routes/ProductRoutes");
const orderRoutes = require("./Routes/orderRoutes");
const paymentRoutes = require("./Routes/paymentRoutes");
const authRoutes = require("./Routes/authRoutes");
const { seedProductsIfEmpty } = require("./seedProducts");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/rows", rowRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);

const frontendDist = path.resolve(__dirname, "../frontend/dist");
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use(express.static(frontendDist, { index: false }));
app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
  if (req.method !== "GET") return next();
  return res.sendFile(path.join(frontendDist, "index.html"), (error) => {
    if (error) next(error);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");

    await seedProductsIfEmpty();

    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
  });
