import express from "express";
import {
  getFeaturedProducts,
  getAllProducts,
  getProductById,
  getCategoryProducts,
  searchProducts,
  getCategories,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/products", getFeaturedProducts);
router.get("/all-products", getAllProducts);
router.get("/product/:id", getProductById);
router.get("/category/:category", getCategoryProducts);
router.get("/search", searchProducts);
router.get("/categories", getCategories);

export default router;