import express from "express";
import {
  getAllOrders,
  updateOrder,
  deleteOrder,
} from "../../controllers/admin/orderController.js";
import authenticateAdmin from "../../middleware/adminAuth.js";

const router = express.Router();

router.get("/orders", authenticateAdmin, getAllOrders);
router.put("/orders/:orderId", authenticateAdmin, updateOrder);
router.delete("/orders/:orderId", authenticateAdmin, deleteOrder);

export default router;