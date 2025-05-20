import express from "express";
import {
  deleteProduct,
  updateProduct,
  updateStock,
  createProduct,
} from "../../controllers/admin/productController.js";
import authenticateAdmin from "../../middleware/adminAuth.js";

const router = express.Router();

router.delete("/products/:id", authenticateAdmin, deleteProduct);
router.put("/products/:id", authenticateAdmin, updateProduct);
router.put("/products/:id/stock", authenticateAdmin, updateStock);
router.post("/products", authenticateAdmin, createProduct);

export default router;