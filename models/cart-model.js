const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    user_name:String,
    productName: String,
    product_id:String,
    price: Number,
    quantity: Number
});

const cart = mongoose.model('cart', cartSchema);

module.exports = cart;