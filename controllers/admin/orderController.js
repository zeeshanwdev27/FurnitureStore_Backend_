import Order from "../../models/Order.js";

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "email username")
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
};

export const updateOrder = async (req, res) => {
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
};

export const deleteOrder = async (req, res) => {
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
};