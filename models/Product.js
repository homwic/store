// models/Product.js
const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    email: String,
    password: String,
  },
  { _id: false }
);

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  desc: String,
  image: String, // base64 string
  stock: [stockSchema],
  snk: String,
});

module.exports = mongoose.model("Product", productSchema);
