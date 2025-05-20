import PromoCode from "../../models/PromoCode.js";

export const getPromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 });
    res.json({ success: true, promoCodes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch promo codes" });
  }
};

export const createPromoCode = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      endDate,
      maxUses,
    } = req.body;

    if (!code || !discountType || !discountValue || !endDate) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    if (discountType === "percentage" && discountValue > 100) {
      return res
        .status(400)
        .json({ error: "Percentage discount cannot exceed 100%" });
    }

    const newPromoCode = new PromoCode({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      endDate: new Date(endDate),
      maxUses: maxUses || null,
    });

    await newPromoCode.save();
    res.status(201).json({ success: true, promoCode: newPromoCode });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Promo code already exists" });
    }
    res.status(500).json({ error: "Failed to create promo code" });
  }
};

export const updatePromoCode = async (req, res) => {
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
};

export const deletePromoCode = async (req, res) => {
  try {
    const promoCode = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promoCode) {
      return res.status(404).json({ error: "Promo code not found" });
    }
    res.json({ success: true, message: "Promo code deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete promo code" });
  }
};

export const validatePromoCode = async (req, res) => {
  try {
    const { code, subtotal } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Promo code is required" });
    }

    const promoCode = await PromoCode.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (!promoCode) {
      return res.status(404).json({ error: "Invalid or expired promo code" });
    }

    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return res
        .status(400)
        .json({ error: "Promo code has reached its usage limit" });
    }

    const orderSubtotal = parseFloat(subtotal) || 0;
    if (orderSubtotal < promoCode.minOrderAmount) {
      return res.status(400).json({
        error: `Minimum order amount of $${promoCode.minOrderAmount.toFixed(
          2
        )} required`,
      });
    }

    let discountAmount = 0;
    if (promoCode.discountType === "percentage") {
      discountAmount = orderSubtotal * (promoCode.discountValue / 100);
      if (
        promoCode.maxDiscountAmount &&
        discountAmount > promoCode.maxDiscountAmount
      ) {
        discountAmount = promoCode.maxDiscountAmount;
      }
    } else {
      discountAmount = promoCode.discountValue;
    }

    discountAmount = Math.min(discountAmount, orderSubtotal);

    res.json({
      success: true,
      discountAmount,
      promoCode: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      promoCodeId: promoCode._id,
    });
  } catch (err) {
    console.error("Promo code validation error:", err);
    res.status(500).json({ error: "Failed to validate promo code" });
  }
};