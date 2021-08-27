const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 1
  },
  phone: {
    type: String,
    required: true,
    minlength: 5
  },
  street: {
    type: String,
    required: true,
    minlength: 5
  },
  city: {
    type: String,
    required: true,
    minlength: 3
  },
  emailAddress: {
    type: String,
    required: true,
    minlength: 5
  },
})

module.exports = mongoose.model('Person', schema)