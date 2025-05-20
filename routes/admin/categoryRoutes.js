import express from "express";
import {
  createCategory,
  getCategoryProducts,
  deleteCategory,
} from "../../controllers/admin/categoryController.js";
import authenticateAdmin from "../../middleware/adminAuth.js";

const router = express.Router();

router.post("/categories", authenticateAdmin, createCategory);
router.get("/category/:categoryId", authenticateAdmin, getCategoryProducts);
router.delete("/categories/:id", authenticateAdmin, deleteCategory);

export default router;