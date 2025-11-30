
const express = require("express");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const User = require("../models/User");
const jwt = require("jsonwebtoken");


const sendEmail = require("../utils/sendEmail");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.post("/checkout", async (req, res) => {
  try {
    const { address, guestId, email: guestEmail } = req.body;
    console.log("HIT CHECKOUT ROUTE");

    if (!address)
      return res.status(400).json({ message: "Address is required" });

    let userId = null;
    let user = null;
    let recipientEmail = null;

  
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        userId = null;
      }
    }

    if (!userId) {
      if (!guestId || !guestEmail) {
        return res.status(400).json({
          message: "Guest checkout requires guestId and a contact email.",
        });
      }
    }

    const cart = await Cart.findOne(
      userId ? { user: userId } : { guestId }
    ).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const items = cart.items.map((i) => ({
      product: i.product._id,
      name: i.product.name,
      size: i.size,
      quantity: i.quantity,
      price: i.product.price,
    }));

    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    if (userId) {
      user = await User.findById(userId);
      recipientEmail = user.email;
    } else {
      recipientEmail = guestEmail;
    }

    const order = await Order.create({
      user: userId || null,
      guestId: userId ? null : guestId,
      items,
      address,
      totalPrice,
    });

    cart.items = [];
    await cart.save();

    const orderDate = order.createdAt.toLocaleString();
    const orderId = order._id.toString();
    const customerName = user ? user.name : "Guest User";

    const itemsHtml = items
      .map(
        (item) =>
          `<li>${item.name} - Size: ${item.size} - Qty: ${item.quantity} - ₹${item.price}</li>`
      )
      .join("");

    const html = `
      <h2>Order Confirmation</h2>
      <p>Hi <strong>${customerName}</strong>,</p>
      <p>Thank you for shopping with us!</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Order Date:</strong> ${orderDate}</p>
      <p><strong>Total Amount:</strong> ₹${totalPrice.toFixed(2)}</p>
      <h3>Order Items:</h3>
      <ul>${itemsHtml}</ul>
      <p>Your order is being processed.</p>
      <p>— Clothing Store Team</p>
    `;


    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: "Your Order Confirmation",
        html,
      });
    }

    await sendEmail({
      to: process.env.EMAIL_USER,
      subject: "New Order Received",
      html: `
        <h2>New Order Placed</h2>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${recipientEmail}</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Total Amount:</strong> ₹${totalPrice.toFixed(2)}</p>
        <h3>Order Items:</h3>
        <ul>${itemsHtml}</ul>
      `,
    });

    res.status(201).json({ message: "Order placed successfully", order });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/my", async (req, res) => {
  try {
    const jwt = require("jsonwebtoken");
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Not authorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const orders = await Order.find({ user: decoded.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
