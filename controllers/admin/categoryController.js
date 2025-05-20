import Category from "../../models/Category.js";
import Product from "../../models/Product.js";

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Valid category name is required" });
    }

    const cleanName = name.trim();

    const newCategory = new Category({
      name: cleanName,
    });

    const savedCategory = await newCategory.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: savedCategory,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Category already exists" });
    }
    console.error("Failed to create category:", err);
    res.status(500).json({
      error: "Failed to create category",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    });
  }
};

export const getCategoryProducts = async (req, res) => {
  try {
    const products = await Product.find({
      category: req.params.categoryId,
    }).populate("category");

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
};