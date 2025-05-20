import Order from "../models/Order.js";
import PromoCode from "../models/PromoCode.js";
import mongoose from "mongoose";

export const createOrder = async (req, res) => {
  try {
    const { shippingInfo, paymentInfo, items } = req.body;

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

    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const calculatedTotal =
      calculatedSubtotal +
      paymentInfo.shipping +
      paymentInfo.tax -
      (paymentInfo.discount || 0);

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
        image: item.image,
      })),
      status: "pending",
    });

    const validationError = order.validateSync();
    if (validationError) {
      console.error("Order validation failed:", validationError);
      return res.status(400).json({
        success: false,
        error: "Order validation failed",
        details: validationError.errors,
      });
    }

    const savedOrder = await order.save();

    if (paymentInfo.promoCode?.promoCodeId) {
      await PromoCode.findByIdAndUpdate(paymentInfo.promoCode.promoCodeId, {
        $inc: { currentUses: 1 },
      });
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
};

export const getUserOrders = async (req, res) => {
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
};

export const getOrderById = async (req, res) => {
  try {
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
};