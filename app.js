import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import dbConnect from "./lib/dbConnect.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/admin/index.js";
import promoCodeRoutes from "./routes/admin/promoCodeRoutes.js"
import categoryRoutes from './routes/admin/categoryRoutes.js'
import productRoute from './routes/admin/productRoute.js'

const app = express();
const port = 3000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Connect to MongoDB
dbConnect();

// Routes
app.get("/", (req, res) => res.send("Hello World!"));
app.use("/api", productRoutes);
app.use("/api", authRoutes);
app.use("/api", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", promoCodeRoutes);
app.use("/api", categoryRoutes);
app.use("/api", productRoute);

// Start Server
app.listen(port, () => console.log(`Server running on port ${port}`));