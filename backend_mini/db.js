const { connect } = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  const MONGODB_URI = 'mongodb://localhost:27017/pawsplay_fund_requests';
  console.log('Connecting to MongoDB:', MONGODB_URI);
  try {
    await connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
