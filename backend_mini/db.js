const { connect } = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  console.log(process.env.MONGO_URI)
  try {
    
    await connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully!');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
