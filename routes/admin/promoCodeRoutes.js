import express from "express";
import {
  getPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  validatePromoCode,
} from "../../controllers/admin/promoCodeController.js";
import authenticateAdmin from "../../middleware/adminAuth.js";

const router = express.Router();

router.get("/promo-codes", authenticateAdmin, getPromoCodes);
router.post("/promo-codes", authenticateAdmin, createPromoCode);
router.put("/promo-codes/:id", authenticateAdmin, updatePromoCode);
router.delete("/promo-codes/:id", authenticateAdmin, deletePromoCode);
router.get("/promo-codes/validate", validatePromoCode);

export default router;