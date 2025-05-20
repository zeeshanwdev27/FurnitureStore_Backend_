import express from "express";
import {
  getAnalyticsStats,
  getSalesData,
  getTrafficData,
  getTopProducts,
  getRecentActivity,
} from "../../controllers/admin/analyticsController.js";
import authenticateAdmin from "../../middleware/adminAuth.js";

const router = express.Router();

router.get("/stats", authenticateAdmin, getAnalyticsStats);
router.get("/sales", authenticateAdmin, getSalesData);
router.get("/traffic", authenticateAdmin, getTrafficData);
router.get("/top-products", authenticateAdmin, getTopProducts);
router.get("/recent-activity", authenticateAdmin, getRecentActivity);

export default router;