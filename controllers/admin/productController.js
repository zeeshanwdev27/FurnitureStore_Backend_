import Product from "../../models/Product.js";

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, image } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        error: "Validation failed",
        details: {
          name: !name ? "Name is required" : undefined,
          price: !price ? "Price is required" : undefined,
          category: !category ? "Category is required" : undefined,
        },
      });
    }

    if (isNaN(price)) {
      return res.status(400).json({
        error: "Validation failed",
        details: { price: "Price must be a number" },
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description: description || "",
        price: parseFloat(price),
        category,
        stock: parseInt(stock) || 0,
        image: image || { url: "", filename: "" },
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        error: "Product not found",
        details: `No product found with ID: ${req.params.id}`,
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Update error:", {
      error: err.message,
      stack: err.stack,
      body: req.body,
      params: req.params,
    });

    res.status(500).json({
      error: "Failed to update product",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
      validationError: err.name === "ValidationError" ? err.errors : undefined,
    });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { stock } = req.body;

    if (typeof stock !== "number" || stock < 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: { stock: "Must be a positive number" },
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      message: "Stock updated",
      newStock: updatedProduct.stock,
    });
  } catch (err) {
    res.status(500).json({
      error: "Stock update failed",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, image } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        error: "Validation failed",
        details: {
          name: !name ? "Name is required" : undefined,
          price: !price ? "Price is required" : undefined,
          category: !category ? "Category is required" : undefined,
        },
      });
    }

    if (isNaN(price)) {
      return res.status(400).json({
        error: "Validation failed",
        details: { price: "Price must be a number" },
      });
    }

    const newProduct = new Product({
      name,
      description: description || "",
      price: parseFloat(price),
      category,
      stock: parseInt(stock) || 0,
      image: image || { url: "", filename: "" },
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct,
    });
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({
      error: "Failed to create product",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
      validationError: err.name === "ValidationError" ? err.errors : undefined,
    });
  }
};