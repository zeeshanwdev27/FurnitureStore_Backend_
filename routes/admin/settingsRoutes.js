import express from "express";
import {
  adminSignin,
  verifyAdminToken,
  getAdminProfile,
  updateAdminProfile,
} from "../../controllers/admin/settingsController.js";
import authenticateAdmin from "../../middleware/adminAuth.js";

const router = express.Router();

router.post("/signin", adminSignin);
router.get("/verify-token", authenticateAdmin, verifyAdminToken);
router.get("/me", authenticateAdmin, getAdminProfile);
router.put("/update-profile", authenticateAdmin, updateAdminProfile);

export default router;