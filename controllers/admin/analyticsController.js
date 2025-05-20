import Order from "../../models/Order.js";
import User from "../../models/User.js";
import { calculatePercentageChange, formatTimeAgo } from "../../utils/helpers.js";

export const getAnalyticsStats = async (req, res) => {
  try {
    const { range = "Last 7 Days" } = req.query;

    const now = new Date();
    let startDate, endDate, comparisonStartDate, comparisonEndDate;

    if (range === "Last 7 Days") {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 7);
      comparisonEndDate = new Date(startDate);
      comparisonStartDate = new Date(startDate);
      comparisonStartDate.setDate(comparisonEndDate.getDate() - 7);
    } else if (range === "Last 30 Days") {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 30);
      comparisonEndDate = new Date(startDate);
      comparisonStartDate = new Date(startDate);
      comparisonStartDate.setDate(comparisonEndDate.getDate() - 30);
    } else if (range === "This Month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
      comparisonStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      comparisonEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (range === "Last Month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      comparisonStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      comparisonEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now);
      comparisonStartDate = new Date(now.getFullYear() - 1, 0, 1);
      comparisonEndDate = new Date(now.getFullYear() - 1, 11, 31);
    }

    const [totalRevenue, totalOrders, newCustomers] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$paymentInfo.total" } } },
      ]),
      Order.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "cancelled" },
      }),
      User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    const [prevRevenue, prevOrders, prevCustomers] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: comparisonStartDate, $lte: comparisonEndDate },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$paymentInfo.total" } } },
      ]),
      Order.countDocuments({
        createdAt: { $gte: comparisonStartDate, $lte: comparisonEndDate },
        status: { $ne: "cancelled" },
      }),
      User.countDocuments({
        createdAt: { $gte: comparisonStartDate, $lte: comparisonEndDate },
      }),
    ]);

    const conversionRate = totalOrders > 0 ? (totalOrders / newCustomers) * 100 : 0;
    const prevConversionRate = prevOrders > 0 ? (prevOrders / prevCustomers) * 100 : 0;

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      newCustomers,
      conversionRate,
      revenueChange: calculatePercentageChange(totalRevenue[0]?.total || 0, prevRevenue[0]?.total || 0),
      ordersChange: calculatePercentageChange(totalOrders, prevOrders),
      customersChange: calculatePercentageChange(newCustomers, prevCustomers),
      conversionChange: calculatePercentageChange(conversionRate, prevConversionRate),
    });
  } catch (err) {
    console.error("Analytics stats error:", err);
    res.status(500).json({ error: "Failed to fetch analytics stats" });
  }
};

export const getSalesData = async (req, res) => {
  try {
    const { range = "Last 7 Days", groupBy = "By Month" } = req.query;

    const now = new Date();
    let startDate, endDate;

    if (range === "Last 7 Days") {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 7);
    } else if (range === "Last 30 Days") {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 30);
    } else if (range === "This Month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
    } else if (range === "Last Month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now);
    }

    let groupStage;
    if (groupBy === "By Month") {
      groupStage = {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$paymentInfo.total" },
          orders: { $sum: 1 },
        },
      };
    } else if (groupBy === "By Week") {
      groupStage = {
        $group: {
          _id: { $week: "$createdAt" },
          revenue: { $sum: "$paymentInfo.total" },
          orders: { $sum: 1 },
        },
      };
    } else {
      groupStage = {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          revenue: { $sum: "$paymentInfo.total" },
          orders: { $sum: 1 },
        },
      };
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: "cancelled" },
        },
      },
      groupStage,
      { $sort: { _id: 1 } },
    ]);

    let formattedData;
    if (groupBy === "By Month") {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      formattedData = salesData.map((item) => ({
        name: monthNames[item._id - 1],
        revenue: item.revenue,
        orders: item.orders,
      }));
    } else if (groupBy === "By Week") {
      formattedData = salesData.map((item) => ({
        name: `Week ${item._id}`,
        revenue: item.revenue,
        orders: item.orders,
      }));
    } else {
      formattedData = salesData.map((item) => ({
        name: `Day ${item._id}`,
        revenue: item.revenue,
        orders: item.orders,
      }));
    }

    res.json(formattedData);
  } catch (err) {
    console.error("Sales analytics error:", err);
    res.status(500).json({ error: "Failed to fetch sales data" });
  }
};

export const getTrafficData = async (req, res) => {
  try {
    res.json([
      { name: "Direct", value: 400 },
      { name: "Social", value: 300 },
      { name: "Referral", value: 200 },
      { name: "Organic", value: 100 },
    ]);
  } catch (err) {
    console.error("Traffic analytics error:", err);
    res.status(500).json({ error: "Failed to fetch traffic data" });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const { range = "Last 7 Days", limit = 5 } = req.query;

    const now = new Date();
    let startDate, endDate;

    if (range === "Last 7 Days") {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 7);
    } else if (range === "Last 30 Days") {
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(endDate.getDate() - 30);
    } else if (range === "This Month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
    } else if (range === "Last Month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now);
    }

    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: "cancelled" },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          sales: { $sum: "$items.quantity" },
        },
      },
      { $sort: { sales: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ["$product.name", "$name"] },
          sales: 1,
        },
      },
    ]);

    res.json(topProducts);
  } catch (err) {
    console.error("Top products analytics error:", err);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentOrders = await Order.find({ status: { $ne: "cancelled" } })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("user", "email");

    const recentActivity = recentOrders.map((order) => {
      let event, status;
      switch (order.status) {
        case "pending":
          event = "New Order";
          status = "Pending";
          break;
        case "processing":
          event = "Order Processing";
          status = "Processed";
          break;
        case "shipped":
          event = "Order Shipped";
          status = "Shipped";
          break;
        case "delivered":
          event = "Order Delivered";
          status = "Completed";
          break;
        default:
          event = "Order Update";
          status = "Processed";
      }

      return {
        event: `${event} #${order._id.toString().slice(-6).toUpperCase()}`,
        user: order.user?.email || order.shippingInfo.email,
        time: formatTimeAgo(order.createdAt),
        status,
      };
    });

    res.json(recentActivity);
  } catch (err) {
    console.error("Recent activity error:", err);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
};