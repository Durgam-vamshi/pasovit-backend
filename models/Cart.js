const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String, required: true, enum: ["S", "M", "L", "XL"] },
  quantity: { type: Number, required: true, default: 1 },
});

const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true }, 
  guestId: { type: String, unique: true, sparse: true },
  items: [CartItemSchema],
}, { timestamps: true });

const Cart = mongoose.model("Cart", CartSchema);
module.exports = Cart;