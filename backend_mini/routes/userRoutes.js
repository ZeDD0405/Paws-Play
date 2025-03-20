const { Router } = require('express');
const User = require('../models/user');
const { hash, compare } = require('bcryptjs');
const { createTransport } = require('nodemailer');
const { randomInt } = require('crypto');
require('dotenv').config();

const router = Router();

// Setup Nodemailer
const transporter = createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP
const generateOTP = () => randomInt(100000, 999999).toString();

// Function to send OTP via email
const sendOTP = async (email, otp) => {
  try {
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Verification',
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
    };

    let mailSent= await transporter.sendMail(mailOptions);
    if(mailSent){
      console.log(`📧 OTP sent to ${email}: ${otp}`);
    }else{
      console.log('mail not sent')
    }
    return mailSent;
   
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
  }
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, msg: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, msg: 'User already exists' });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

    // Create a new user with the OTP and expiration
    const newUser = new User({
      username,
      email,
      password: await hash(password, 10), // Hash the password before saving
      role: 'user', // Default role
      otp,
      otpExpires,
    });

    await newUser.save();
    let mailSent = await sendOTP(email, otp); // Send OTP via email

    if (mailSent) {
      return res.status(200).json({ success: true, msg: 'OTP sent', redirectUrl: 'otp.html' });
    } else {
      return res.status(500).json({ success: false, msg: 'Internal server error' });
    }
  } catch (e) {
    console.log('Error in register router:', e);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});


// OTP Validation (for login)
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ success: false, msg: 'User not found' });
  }

  // Check OTP and expiration
  if (user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ success: false, msg: 'Invalid or expired OTP' });
  }

  // Clear OTP and expiration after verification
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.status(200).json({ success: true, msg: 'OTP verified successfully' });
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ success: false, msg: 'User not found' });
  }

  const isMatch = await compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ success: false, msg: 'Invalid credentials' });
  }

  if (!otp) {
    // Generate a new OTP and send it if not provided
    const newOtp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
    user.otp = newOtp;
    user.otpExpires = otpExpires;
    await user.save();
    await sendOTP(email, newOtp);  // Send OTP via email
    return res.status(200).json({ success: true, msg: 'OTP sent to email' });
  } else {
    // Validate OTP if provided
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, msg: 'Invalid or expired OTP' });
    }

    // Clear OTP and expiration after successful login
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      success: true,
      msg: 'Login successful',
      user: { id: user._id, username: user.username, role: user.role },
    });
  }
});

module.exports = router;
