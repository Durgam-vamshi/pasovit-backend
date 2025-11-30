
const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middlewares/auth");

const router = express.Router();

const getCart = async ({ userId, guestId }) => {
  let query = {};
  if (userId) query.user = userId;
  else query.guestId = guestId;

  let cart = await Cart.findOne(query).populate("items.product");
  if (!cart) {
    cart = await Cart.create({
      user: userId || undefined,
      guestId: userId ? undefined : guestId,
      items: []
    });
    cart = await cart.populate("items.product");
  }
  return cart;
};

router.get("/guest/:guestId", async (req, res) => {
  try {
    const { guestId } = req.params;
    if (!guestId) return res.status(400).json({ message: "guestId required" });

    const cart = await getCart({ guestId });
    res.json(cart);
  } catch (err) {
    console.error("Get guest cart error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const cart = await getCart({ userId: req.user._id });
    res.json(cart);
  } catch (err) {
    console.error("Get user cart error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/add", async (req, res) => {
  console.log("add to cart request body:", req.body);
  console.log("guestId received in add:", req.body.guestId);


  try {
    const { productId, size, quantity, guestId } = req.body;
    console.log("guestId received in add:", guestId);


    if (!productId || !size || !quantity)
      return res.status(400).json({ message: "productId, size, quantity required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!product.sizes.includes(size))
      return res.status(400).json({ message: "Invalid size for this product" });

    const userId = req.headers.authorization
      ? (() => {
        const jwt = require("jsonwebtoken");
        try {
          const token = req.headers.authorization.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          return decoded.id;
        } catch {
          return null;
        }
      })()
      : null;

    if (!userId && !guestId) {
      return res.status(400).json({ message: "guestId required for guest cart" });
    }

    const cart = await getCart({ userId, guestId });

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.product._id.toString() === productId && item.size === size
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += Number(quantity);
    } else {
      cart.items.push({
        product: productId,
        size,
        quantity: Number(quantity)
      });
    }

    await cart.save();
    const populated = await Cart.findById(cart._id).populate("items.product");
    res.json(populated);
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/item", async (req, res) => {
  try {
    const { productId, size, quantity, guestId } = req.body;
    if (!productId || !size || quantity == null)
      return res.status(400).json({ message: "productId, size, quantity required" });

    const userId = req.headers.authorization
      ? (() => {
        const jwt = require("jsonwebtoken");
        try {
          const token = req.headers.authorization.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          return decoded.id;
        } catch {
          return null;
        }
      })()
      : null;

    if (!userId && !guestId)
      return res.status(400).json({ message: "guestId required for guest cart" });

    const cart = await getCart({ userId, guestId });

    const item = cart.items.find(
      (i) =>
        i.product._id.toString() === productId && i.size === size
    );
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (i) =>
          !(
            i.product._id.toString() === productId.toString() && i.size === size
          )
      );
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    const populated = await Cart.findById(cart._id).populate("items.product");
    res.json(populated);
  } catch (err) {
    console.error("Update cart item error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/item", async (req, res) => {
  try {
    const { productId, size, guestId } = req.body;

    const userId = req.headers.authorization
      ? (() => {
        const jwt = require("jsonwebtoken");
        try {
          const token = req.headers.authorization.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          return decoded.id;
        } catch {
          return null;
        }
      })()
      : null;

    if (!userId && !guestId)
      return res.status(400).json({ message: "guestId required for guest cart" });

    const cart = await getCart({ userId, guestId });

    cart.items = cart.items.filter(
      (i) => !(i.product._id.toString() === productId && i.size === size)
    );

    await cart.save();
    const populated = await Cart.findById(cart._id).populate("items.product");
    res.json(populated);
  } catch (err) {
    console.error("Remove cart item error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
