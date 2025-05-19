import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";

import Product from "./models/Product.js";
import User from "./models/User.js";
import connectDB from "./lib/dbConnect.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import Order from "./models/Order.js";
import Category from "./models/Category.js";
import PromoCode from "./models/PromoCode.js";

const app = express();
const port = 3000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json());
connectDB(); // Connect to MongoDB

// JWT Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Admin Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Admin authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if the user is an admin
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== "Admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
};

// ********Routes***********
app.get("/", (req, res) => res.send("Hello World!"));

// Featured Product Routes
app.get("/api/products", async (req, res) => {
  try {
    const data = await Product.find().populate('category', 'name');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// All Products Route
app.get("/api/all-products", async (req, res) => {
  try {
    const products = await Product.find().populate('category', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all products" });
  }
});

// Specific Product with populated category
app.get("/api/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name'); // Populate only the category name
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ 
      error: "Failed to fetch product",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// Category Products route (updated)
app.get("/api/category/:category", async (req, res) => {
  try {
    // First find if the param is an ID or name
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.category);
    
    let products;
    if (isObjectId) {
      products = await Product.find({ category: req.params.category })
        .populate('category', 'name');
    } else {
      // Find by category name
      const category = await Category.findOne({ 
        name: { $regex: new RegExp(`^${req.params.category}$`, 'i') }
      });
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      products = await Product.find({ category: category._id })
        .populate('category', 'name');
    }

    if (!products.length) {
      return res.status(404).json({ error: "No products found in this category" });
    }
    
    res.json(products);
  } catch (err) {
    console.error("Error fetching category products:", err);
    res.status(500).json({ 
      error: "Server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// Search Route
app.get("/api/search", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.json({ products: [] });

  try {
    const products = await Product.find({
      name: { $regex: query, $options: "i" },
    }).limit(10).populate('category', 'name')
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// SignUp Route
app.post("/api/signup", async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      // Validation
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] }); // Check existing user
    if (existingUser) {
      return res.status(400).json({
        error:
          existingUser.email === email
            ? "Email already in use"
            : "Username already taken",
      });
    }

    // const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    const newUser = new User({
      // Create user
      email,
      username,
      // password: hashedPassword,
      password,
    });
    
    // Update lastLogin timestamp
    newUser.lastLogin = new Date();
    await newUser.save();

    const token = jwt.sign(
      // Generate JWT token
      { userId: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "User created and logged in",
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
      },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// SignIn
app.post("/api/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }); // Find user
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user is suspended
    if (user.status === 'Suspended') {
      return res.status(403).json({ 
        error: "Your account has been suspended. Please contact support." 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password); // Check password
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      // Generate token
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Protected Route Example
app.get("/api/protected", authenticate, (req, res) => {
  res.json({ message: "This is protected data", userId: req.userId });
});


// ====== Order Routes ======

// Order Routes - Updated version
app.post("/api/orders", authenticate, async (req, res) => {
  try {
    const { shippingInfo, paymentInfo, items } = req.body;

    // Validate required fields
    const requiredShippingFields = [
      "firstName",
      "lastName",
      "email",
      "address",
      "city",
      "state",
      "zipCode",
    ];
    const missingShippingFields = requiredShippingFields.filter(
      (field) => !shippingInfo[field]
    );

    if (missingShippingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing shipping fields: ${missingShippingFields.join(", ")}`,
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Cart is empty",
      });
    }

    // Validate each item in cart
    const invalidItems = items.filter(
      (item) =>
        !item.product ||
        !mongoose.Types.ObjectId.isValid(item.product) ||
        typeof item.price !== "number" ||
        isNaN(item.price) ||
        !item.quantity ||
        typeof item.quantity !== "number" ||
        isNaN(item.quantity)
    );

    if (invalidItems.length > 0) {
      console.error("Invalid items detected:", invalidItems);
      return res.status(400).json({
        success: false,
        error: "Invalid items in cart",
        invalidItems: invalidItems.map((i) => ({ product: i.product })),
      });
    }

    // Calculate totals to verify client calculation
    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const calculatedTotal =
      calculatedSubtotal +
      paymentInfo.shipping +
      paymentInfo.tax -
      (paymentInfo.discount || 0);

    // Create order document
    const order = new Order({
      user: req.userId,
      shippingInfo,
      paymentInfo: {
        ...paymentInfo,
        subtotal: calculatedSubtotal,
        total: calculatedTotal,
      },
      items: items.map((item) => ({
        product: item.product,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      status: "pending",
    });

    // Validate before saving
    const validationError = order.validateSync();
    if (validationError) {
      console.error("Order validation failed:", validationError);
      return res.status(400).json({
        success: false,
        error: "Order validation failed",
        details: validationError.errors,
      });
    }

    // Save to database
    const savedOrder = await order.save();
    
    // Increment promo code usage if applied
    if (paymentInfo.promoCode?.promoCodeId) {
      await PromoCode.findByIdAndUpdate(
        paymentInfo.promoCode.promoCodeId,
        { $inc: { currentUses: 1 } }
      );
    }

    res.status(201).json({
      success: true,
      orderId: savedOrder._id,
      order: savedOrder,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Order already exists",
        details: err.keyValue,
      });
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: Object.values(err.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create order",
      ...(process.env.NODE_ENV === "development" && {
        details: {
          message: err.message,
          stack: err.stack,
        },
      }),
    });
  }
});

// Get all orders for authenticated user
app.get("/api/orders", authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("items.product", "name price image")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Enhanced Order Route
app.get("/api/orders/:orderId", authenticate, async (req, res) => {
  try {
    // console.log(`Fetching order ${req.params.orderId} for user ${req.userId}`);

    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format",
      });
    }

    const order = await Order.findById(req.params.orderId)
      .populate("items.product", "name price image")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    if (order.user.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this order",
      });
    }

    // Convert Mongoose document to plain object and format dates
    const formattedOrder = {
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt?.toISOString(),
    };

    res.json({
      success: true,
      order: formattedOrder,
    });
  } catch (err) {
    console.error("Order fetch error:", {
      error: err.message,
      stack: err.stack,
      orderId: req.params.orderId,
      userId: req.userId,
    });

    res.status(500).json({
      success: false,
      error: "Failed to fetch order",
      ...(process.env.NODE_ENV === "development" && {
        details: err.message,
      }),
    });
  }
});




// ====== Admin Panel ROutes======

// ====== AdminSignIn Route for Admin Panel ======
app.post("/api/admin/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: "Admin" });
    
    if (!user) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Admin login successful",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      token,
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Server error during admin login" });
  }
});

app.get('/api/admin/verify-token', authenticateAdmin, (req, res) => {
  res.json({ isValid: true });
});

// ====== Delete Products Routes for Admin Panel ======
app.delete("/api/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ====== Update Products Routes for Admin Panel ======
app.put("/api/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const { name, description, price, category, stock, image } = req.body;

    // Enhanced validation
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
        details: {
          price: "Price must be a number",
        },
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
      { new: true, runValidators: true } // Added runValidators
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
});

// ====== Update Stock Routes for Admin Panel ======
app.put("/api/products/:id/stock", authenticateAdmin, async (req, res) => {
  try {
    const { stock } = req.body;

    // Validate stock value
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
});

// ====== Add Product Routes for Admin Panel ======
app.post("/api/products", authenticateAdmin, async (req, res) => {
  try {
    const { name, description, price, category, stock, image } = req.body;

    // Validation
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
        details: {
          price: "Price must be a number",
        },
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
});

// ====== Order Routes for Admin Panel ======
app.get("/api/admin/orders", authenticateAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "email username") // Include user info
      .populate("items.product", "name price image")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error("Admin order fetch error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

app.put("/api/admin/orders/:orderId", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (
      !status ||
      !["pending", "processing", "shipped", "delivered", "cancelled"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "Valid status is required",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Admin order update error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update order",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

app.delete("/api/admin/orders/:orderId", authenticateAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    console.error("Admin order delete error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete order",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ====== User Routes for Admin Panel ======
app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const { username, email, password, role, status } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email and password are required" });
    }

    // Check if trying to create admin and one already exists
    if (role === "Admin") {
      const existingAdmin = await User.findOne({ role: "Admin" });
      if (existingAdmin) {
        return res.status(400).json({ 
          error: "Admin user already exists. Only one admin is allowed." 
        });
      }
    }

    const newUser = new User({
      username,
      email,
      password,
      role: role || "Customer",
      status: status || "Active",
    });

    await newUser.save();
    res.status(201).json({ user: newUser });
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.put("/api/admin/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const { username, email, role, status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, role, status },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/api/admin/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});


// ====== AdminSettings Routes for Admin Panel ======
app.get('/api/admin/me', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ role: "Admin" });
    // console.log(user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

app.put('/api/admin/update-profile', authenticateAdmin, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ role: "Admin" });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if password is being changed
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      // Just assign the new password - hashing will be handled by the model
      user.password = newPassword;
    }

    // Update email if changed
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ error: "Email already in use" });
      }
      user.email = email;
    }

    await user.save();

    res.json({ 
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ====== Analytics Routes for Admin Panel ======
app.get('/api/analytics/stats', authenticateAdmin, async (req, res) => {
  try {
    const { range = 'Last 7 Days' } = req.query;
    
    // Calculate date ranges based on the selected time range
    const now = new Date();
    let startDate, endDate, comparisonStartDate, comparisonEndDate;
    
    if (range === 'Last 7 Days') {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 7);
      
      comparisonEndDate = new Date(startDate);
      comparisonStartDate = new Date(startDate);
      comparisonStartDate.setDate(comparisonEndDate.getDate() - 7);
    } else if (range === 'Last 30 Days') {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 30);
      
      comparisonEndDate = new Date(startDate);
      comparisonStartDate = new Date(startDate);
      comparisonStartDate.setDate(comparisonEndDate.getDate() - 30);
    } else if (range === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
      
      comparisonStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      comparisonEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (range === 'Last Month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      
      comparisonStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      comparisonEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    } else { // This Year
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now);
      
      comparisonStartDate = new Date(now.getFullYear() - 1, 0, 1);
      comparisonEndDate = new Date(now.getFullYear() - 1, 11, 31);
    }
    
    // Fetch current period data
    const [totalRevenue, totalOrders, newCustomers] = await Promise.all([
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
          } 
        },
        { $group: { _id: null, total: { $sum: "$paymentInfo.total" } } }
      ]),
      Order.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }),
      User.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate }
      })
    ]);
    
    // Fetch comparison period data
    const [prevRevenue, prevOrders, prevCustomers] = await Promise.all([
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: comparisonStartDate, $lte: comparisonEndDate },
            status: { $ne: 'cancelled' }
          } 
        },
        { $group: { _id: null, total: { $sum: "$paymentInfo.total" } } }
      ]),
      Order.countDocuments({ 
        createdAt: { $gte: comparisonStartDate, $lte: comparisonEndDate },
        status: { $ne: 'cancelled' }
      }),
      User.countDocuments({ 
        createdAt: { $gte: comparisonStartDate, $lte: comparisonEndDate }
      })
    ]);
    
    // Calculate conversion rate (simplified - would need session data for real conversion)
    const conversionRate = totalOrders > 0 ? (totalOrders / newCustomers) * 100 : 0;
    const prevConversionRate = prevOrders > 0 ? (prevOrders[0]?.total || 0 / prevCustomers) * 100 : 0;
    
    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      newCustomers,
      conversionRate,
      revenueChange: calculatePercentageChange(totalRevenue[0]?.total || 0, prevRevenue[0]?.total || 0),
      ordersChange: calculatePercentageChange(totalOrders, prevOrders),
      customersChange: calculatePercentageChange(newCustomers, prevCustomers),
      conversionChange: calculatePercentageChange(conversionRate, prevConversionRate)
    });
    
  } catch (err) {
    console.error('Analytics stats error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics stats' });
  }
});

app.get('/api/analytics/sales', authenticateAdmin,  async (req, res) => {
  try {
    const { range = 'Last 7 Days', groupBy = 'By Month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate, endDate;
    
    if (range === 'Last 7 Days') {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 7);
    } else if (range === 'Last 30 Days') {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 30);
    } else if (range === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
    } else if (range === 'Last Month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else { // This Year
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now);
    }
    
    let groupStage;
    if (groupBy === 'By Month') {
      groupStage = {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$paymentInfo.total" },
          orders: { $sum: 1 }
        }
      };
    } else if (groupBy === 'By Week') {
      groupStage = {
        $group: {
          _id: { $week: "$createdAt" },
          revenue: { $sum: "$paymentInfo.total" },
          orders: { $sum: 1 }
        }
      };
    } else { // By Day
      groupStage = {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          revenue: { $sum: "$paymentInfo.total" },
          orders: { $sum: 1 }
        }
      };
    }
    
    const salesData = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' }
        } 
      },
      groupStage,
      { $sort: { "_id": 1 } }
    ]);
    
    // Format data for chart
    let formattedData;
    if (groupBy === 'By Month') {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      formattedData = salesData.map(item => ({
        name: monthNames[item._id - 1],
        revenue: item.revenue,
        orders: item.orders
      }));
    } else if (groupBy === 'By Week') {
      formattedData = salesData.map(item => ({
        name: `Week ${item._id}`,
        revenue: item.revenue,
        orders: item.orders
      }));
    } else { // By Day
      formattedData = salesData.map(item => ({
        name: `Day ${item._id}`,
        revenue: item.revenue,
        orders: item.orders
      }));
    }
    
    res.json(formattedData);
  } catch (err) {
    console.error('Sales analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

app.get('/api/analytics/traffic', authenticateAdmin,  async (req, res) => {
  try {
    // In a real app, you would get this from your analytics system
    // This is just a placeholder with demo data
    res.json([
      { name: 'Direct', value: 400 },
      { name: 'Social', value: 300 },
      { name: 'Referral', value: 200 },
      { name: 'Organic', value: 100 }
    ]);
  } catch (err) {
    console.error('Traffic analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch traffic data' });
  }
});

app.get('/api/analytics/top-products', authenticateAdmin,  async (req, res) => {
  try {
    const { range = 'Last 7 Days', limit = 5 } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate, endDate;
    
    if (range === 'Last 7 Days') {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 7);
    } else if (range === 'Last 30 Days') {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 30);
    } else if (range === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
    } else if (range === 'Last Month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else { // This Year
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now);
    }
    
    const topProducts = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' }
        } 
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          sales: { $sum: "$items.quantity" }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ["$product.name", "$name"] },
          sales: 1
        }
      }
    ]);
    
    res.json(topProducts);
  } catch (err) {
    console.error('Top products analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

app.get('/api/analytics/recent-activity', authenticateAdmin,  async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Get recent orders
    const recentOrders = await Order.find({ status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('user', 'email');
    
    // Format for display
    const recentActivity = recentOrders.map(order => {
      let event, status;
      
      switch(order.status) {
        case 'pending':
          event = 'New Order';
          status = 'Pending';
          break;
        case 'processing':
          event = 'Order Processing';
          status = 'Processed';
          break;
        case 'shipped':
          event = 'Order Shipped';
          status = 'Shipped';
          break;
        case 'delivered':
          event = 'Order Delivered';
          status = 'Completed';
          break;
        default:
          event = 'Order Update';
          status = 'Processed';
      }
      
      return {
        event: `${event} #${order._id.toString().slice(-6).toUpperCase()}`,
        user: order.user?.email || order.shippingInfo.email,
        time: formatTimeAgo(order.createdAt),
        status
      };
    });
    
    res.json(recentActivity);
  } catch (err) {
    console.error('Recent activity error:', err);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});


// ====== Create/Delete New Category Routes for Admin Panel ======
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    res.status(500).json({ 
      error: "Failed to fetch categories",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

app.post('/api/categories', authenticateAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: "Valid category name is required" });
    }

    const cleanName = name.trim();
    
    const newCategory = new Category({
      name: cleanName
    });

    const savedCategory = await newCategory.save();

    res.status(201).json({ 
      success: true,
      message: "Category created successfully",
      category: savedCategory
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Category already exists" });
    }
    console.error('Failed to create category:', err);
    res.status(500).json({ 
      error: "Failed to create category",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

app.get('/api/category/:categoryId', authenticateAdmin, async (req, res) => {
  try {
    const products = await Product.find({ 
      category: req.params.categoryId 
    }).populate('category');
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/api/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});





// ======  Promo Code Routes for Admin Panel ====== 

app.get('/api/admin/promo-codes', authenticateAdmin, async (req, res) => {
  try {
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 });
    res.json({ success: true, promoCodes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch promo codes" });
  }
});

app.post('/api/admin/promo-codes', authenticateAdmin, async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      endDate,
      maxUses
    } = req.body;

    // Basic validation
    if (!code || !discountType || !discountValue || !endDate) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({ error: "Percentage discount cannot exceed 100%" });
    }

    const newPromoCode = new PromoCode({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      endDate: new Date(endDate),
      maxUses: maxUses || null
    });

    await newPromoCode.save();
    res.status(201).json({ success: true, promoCode: newPromoCode });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Promo code already exists" });
    }
    res.status(500).json({ error: "Failed to create promo code" });
  }
});

app.put('/api/admin/promo-codes/:id', authenticateAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const promoCode = await PromoCode.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!promoCode) {
      return res.status(404).json({ error: "Promo code not found" });
    }

    res.json({ success: true, promoCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to update promo code" });
  }
});

app.delete('/api/admin/promo-codes/:id', authenticateAdmin, async (req, res) => {
  try {
    const promoCode = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promoCode) {
      return res.status(404).json({ error: "Promo code not found" });
    }
    res.json({ success: true, message: "Promo code deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete promo code" });
  }
});

app.get('/api/promo-codes/validate', authenticateAdmin, async (req, res) => {
  try {
    const { code, subtotal } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: "Promo code is required" });
    }

    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    if (!promoCode) {
      return res.status(404).json({ error: "Invalid or expired promo code" });
    }

    // Check max uses
    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return res.status(400).json({ error: "Promo code has reached its usage limit" });
    }

    // Check minimum order amount
    const orderSubtotal = parseFloat(subtotal) || 0;
    if (orderSubtotal < promoCode.minOrderAmount) {
      return res.status(400).json({ 
        error: `Minimum order amount of $${promoCode.minOrderAmount.toFixed(2)} required`
      });
    }

    let discountAmount = 0;
    
    if (promoCode.discountType === "percentage") {
      discountAmount = orderSubtotal * (promoCode.discountValue / 100);
      if (promoCode.maxDiscountAmount && discountAmount > promoCode.maxDiscountAmount) {
        discountAmount = promoCode.maxDiscountAmount;
      }
    } else {
      discountAmount = promoCode.discountValue;
    }

    // Ensure discount doesn't exceed order subtotal
    discountAmount = Math.min(discountAmount, orderSubtotal);

    res.json({
      success: true,
      discountAmount,
      promoCode: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      promoCodeId: promoCode._id
    });

  } catch (err) {
    console.error("Promo code validation error:", err);
    res.status(500).json({ error: "Failed to validate promo code" });
  }
});



// ====== Helper Functions ======
function calculatePercentageChange(current, previous) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;
  
  return `${Math.floor(seconds)} second${seconds === 1 ? '' : 's'} ago`;
}

// Start Server
app.listen(port, () => console.log(`Server running on port ${port}`));
