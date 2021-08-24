require('dotenv').config();

const PORT = process.env.PORT || 3001;

let { MONGODB_URI } = process.env;
// used to be in and used by note.js
if (process.env.NODE_ENV === 'test') {
  MONGODB_URI = process.env.TEST_MONGODB_URI;
}

module.exports = {
  MONGODB_URI,
  PORT,
};
