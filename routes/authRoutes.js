import express from "express";
import { signup, signin, protectedRoute } from "../controllers/authController.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/protected", authenticate, protectedRoute);

export default router;