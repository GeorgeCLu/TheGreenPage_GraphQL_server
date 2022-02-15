const mongoose = require('mongoose');
const isEmail = require('validator/lib/isEmail');

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 1,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    minlength: 1,
    validate: [{ validator: isEmail, msg: 'Invalid email.' }],
  },
  passwordHash: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('User', schema);
