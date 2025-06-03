const express = require('express');
const Admin = require('../models/admin'); // Import the Admin model
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin || admin.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.status(200).json({
      success: true,
      admin: {
        username: admin.username,
        email: admin.email,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

