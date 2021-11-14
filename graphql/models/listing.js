const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 1,
  },
  phone: {
    type: String,
    required: true,
    minlength: 3,
  },
  street: {
    type: String,
    required: true,
    minlength: 1,
  },
  city: {
    type: String,
    required: true,
    minlength: 1,
  },
  emailAddress: {
    type: String,
    required: true,
    minlength: 5,
  },
  category: {
    type: String,
    required: true,
    minlength: 1,
  },
  description: {
    type: String,
    required: true,
    minlength: 1,
  },
});

module.exports = mongoose.model('Listing', schema);
