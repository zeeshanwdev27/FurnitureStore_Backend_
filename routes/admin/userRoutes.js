import express from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../controllers/admin/userController.js";
import authenticateAdmin from "../../middleware/adminAuth.js";

const router = express.Router();

router.get("/users", authenticateAdmin, getAllUsers);
router.post("/users", authenticateAdmin, createUser);
router.put("/users/:id", authenticateAdmin, updateUser);
router.delete("/users/:id", authenticateAdmin, deleteUser);

export default router;