import Product from "../models/Product.js";
import mongoose from "mongoose";
import Category from "../models/Category.js";

export const getFeaturedProducts = async (req, res) => {
  try {
    const data = await Product.find().populate("category", "name");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("category", "name");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all products" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category",
      "name"
    );
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({
      error: "Failed to fetch product",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    });
  }
};

export const getCategoryProducts = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.category);
    let products;
    if (isObjectId) {
      products = await Product.find({ category: req.params.category }).populate(
        "category",
        "name"
      );
    } else {
      const category = await Category.findOne({
        name: { $regex: new RegExp(`^${req.params.category}$`, "i") },
      });
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      products = await Product.find({ category: category._id }).populate(
        "category",
        "name"
      );
    }

    if (!products.length) {
      return res.status(404).json({ error: "No products found in this category" });
    }
    res.json(products);
  } catch (err) {
    console.error("Error fetching category products:", err);
    res.status(500).json({
      error: "Server error",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    });
  }
};

export const searchProducts = async (req, res) => {
  const query = req.query.query;
  if (!query) return res.json({ products: [] });

  try {
    const products = await Product.find({
      name: { $regex: query, $options: "i" },
    })
      .limit(10)
      .populate("category", "name");
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    res.status(500).json({
      error: "Failed to fetch categories",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    });
  }
};