const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: String,
    name: String,
    password: String,
    dob: String,
    gender: String,
    role: String,
    cart: [String]
});

const User = mongoose.model('user', userSchema);

module.exports = User;