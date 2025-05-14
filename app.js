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

const app = express();
const port = 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Or whatever port your React app runs on
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
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

// ********Routes***********
app.get("/", (req, res) => res.send("Hello World!"));

// Featured Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const data = await Product.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// All Products Route
app.get("/api/all-products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all products" });
  }
});

// Category Route
app.get("/api/category/:category", async (req, res) => {
  try {
    const category = req.params.category;
    const products = await Product.find({ category });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Specific Product
app.get("/api/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Search Route
app.get("/api/search", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.json({ products: [] });

  try {
    const products = await Product.find({
      name: { $regex: query, $options: "i" },
    }).limit(10);
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

    const isMatch = await bcrypt.compare(password, user.password); // Check password
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

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


// Order Routes - Updated version
app.post('/api/orders', authenticate, async (req, res) => {
  try {
    console.log('Received order request from user:', req.userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { shippingInfo, paymentInfo, items } = req.body;
    
    // Validate required fields
    const requiredShippingFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'];
    const missingShippingFields = requiredShippingFields.filter(field => !shippingInfo[field]);
    
    if (missingShippingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: `Missing shipping fields: ${missingShippingFields.join(', ')}`
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Cart is empty"
      });
    }

    // Validate each item in cart
    const invalidItems = items.filter(item => (
      !item.product || 
      !mongoose.Types.ObjectId.isValid(item.product) ||
      typeof item.price !== 'number' || 
      isNaN(item.price) ||
      !item.quantity || 
      typeof item.quantity !== 'number' ||
      isNaN(item.quantity)
    ));

    if (invalidItems.length > 0) {
      console.error('Invalid items detected:', invalidItems);
      return res.status(400).json({
        success: false,
        error: "Invalid items in cart",
        invalidItems: invalidItems.map(i => ({ product: i.product }))
      });
    }

    // Calculate totals to verify client calculation
    const calculatedSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const calculatedTotal = calculatedSubtotal + paymentInfo.shipping + paymentInfo.tax - (paymentInfo.discount || 0);

    // Create order document with proper item mapping
    const order = new Order({
      user: req.userId,
      shippingInfo,
      paymentInfo: {
        ...paymentInfo,
        subtotal: calculatedSubtotal,
        total: calculatedTotal
      },
      items: items.map(item => ({
        product: item.product,  // Use item.product instead of item._id
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      status: 'pending',
      createdAt: new Date()
    });

    // Validate before saving
    const validationError = order.validateSync();
    if (validationError) {
      console.error('Order validation failed:', validationError);
      return res.status(400).json({
        success: false,
        error: "Order validation failed",
        details: validationError.errors
      });
    }

    // Save to database
    const savedOrder = await order.save();
    console.log(`Order ${savedOrder._id} created successfully`);

    res.status(201).json({
      success: true,
      orderId: savedOrder._id,
      order: savedOrder
    });

  } catch (err) {
    console.error("Order creation error:", err);
    
    // Handle duplicate key errors (MongoDB)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Order already exists",
        details: err.keyValue
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: Object.values(err.errors).map(e => e.message)
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: "Failed to create order",
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          message: err.message,
          stack: err.stack
        }
      })
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
      orders
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch orders",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
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
        error: "Invalid order ID format"
      });
    }

    const order = await Order.findById(req.params.orderId)
      .populate("items.product", "name price image")
      .lean();

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: "Order not found"
      });
    }

    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ 
        success: false,
        error: "Not authorized to view this order"
      });
    }

    // Convert Mongoose document to plain object and format dates
    const formattedOrder = {
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt?.toISOString()
    };

    res.json({
      success: true,
      order: formattedOrder
    });
    
  } catch (err) {
    console.error("Order fetch error:", {
      error: err.message,
      stack: err.stack,
      orderId: req.params.orderId,
      userId: req.userId
    });
    
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch order",
      ...(process.env.NODE_ENV === 'development' && {
        details: err.message
      })
    });
  }
});



// Admin ROutes


// Delete Products for Admin Panel
app.delete("/api/products/:id", async (req, res) => {
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

// Update Products for Admin Panel
app.put("/api/products/:id", async (req, res) => {
  try {
    const { name, description, price, category, stock, image } = req.body;
    
    // Enhanced validation
    if (!name || !price || !category) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: {
          name: !name ? "Name is required" : undefined,
          price: !price ? "Price is required" : undefined,
          category: !category ? "Category is required" : undefined
        }
      });
    }

    if (isNaN(price)) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: {
          price: "Price must be a number"
        }
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
        image: image || { url: "", filename: "" }
      },
      { new: true, runValidators: true } // Added runValidators
    );

    if (!updatedProduct) {
      return res.status(404).json({ 
        error: "Product not found",
        details: `No product found with ID: ${req.params.id}`
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct
    });
  } catch (err) {
    console.error("Update error:", {
      error: err.message,
      stack: err.stack,
      body: req.body,
      params: req.params
    });
    
    res.status(500).json({ 
      error: "Failed to update product",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      validationError: err.name === 'ValidationError' ? err.errors : undefined
    });
  }
});


// Update Only Stocks for Admin Panel
app.put("/api/products/:id/stock", async (req, res) => {
  try {
    const { stock } = req.body;

    // Validate stock value
    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: { stock: "Must be a positive number" }
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
      newStock: updatedProduct.stock
    });
  } catch (err) {
    res.status(500).json({ 
      error: "Stock update failed",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Add Product for Admin Panel
app.post("/api/products", async (req, res) => {
  try {
    const { name, description, price, category, stock, image } = req.body;
    
    // Validation
    if (!name || !price || !category) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: {
          name: !name ? "Name is required" : undefined,
          price: !price ? "Price is required" : undefined,
          category: !category ? "Category is required" : undefined
        }
      });
    }

    if (isNaN(price)) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: {
          price: "Price must be a number"
        }
      });
    }

    const newProduct = new Product({
      name,
      description: description || "",
      price: parseFloat(price),
      category,
      stock: parseInt(stock) || 0,
      image: image || { url: "", filename: "" }
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct
    });
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ 
      error: "Failed to create product",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      validationError: err.name === 'ValidationError' ? err.errors : undefined
    });
  }
});


// Order Routes for Admin Panel
app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "email username") // Include user info
      .populate("items.product", "name price image")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error("Admin order fetch error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch orders",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.put("/api/admin/orders/:orderId", async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Valid status is required"
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
        error: "Order not found"
      });
    }

    res.json({
      success: true,
      order
    });
    
  } catch (err) {
    console.error("Admin order update error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to update order",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});



// Start Server
app.listen(port, () => console.log(`Server running on port ${port}`));
