import express from "express";
import { createOrder, getUserOrders, getOrderById } from "../controllers/orderController.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

router.post("/orders", authenticate, createOrder);
router.get("/orders", authenticate, getUserOrders);
router.get("/orders/:orderId", authenticate, getOrderById);

export default router;