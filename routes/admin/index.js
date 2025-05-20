import express from "express";
import productRoutes from "./productRoute.js";
import orderRoutes from "./orderRoutes.js";
import userRoutes from "./userRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import promoCodeRoutes from "./promoCodeRoutes.js";

const router = express.Router();

router.use(productRoutes);
router.use(orderRoutes);
router.use(userRoutes);
router.use(settingsRoutes);
router.use(analyticsRoutes);
router.use(categoryRoutes);
router.use(promoCodeRoutes);

export default router;