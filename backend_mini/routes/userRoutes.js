const { Router } = require('express');
const { User, Hero, Donator } = require('../models/user');
const Admin = require('../models/admin');
const { hash, compare } = require('bcryptjs');
const { randomInt } = require('crypto');
const transporter = require('../config/email');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const router = Router();

// Generate OTP
const generateOTP = () => randomInt(100000, 999999).toString();

// Function to send OTP via email
const sendOTP = async (email, otp) => {
  try {
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for PawsPlay Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a4a4a;">PawsPlay Verification</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      `
    };

    let mailSent = await transporter.sendMail(mailOptions);
    if(mailSent) {
      console.log(`📧 OTP sent to ${email}`);
      return true;
    }
    return false;
   
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return false;
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role, gender } = req.body;

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
      password: await hash(password, 10),
      role,
      gender,
      otp,
      otpExpires,
    });

    await newUser.save();

    // Create role-specific profile
    if (role === 'hero') {
      console.log('Creating hero profile for user:', newUser._id);
      const hero = new Hero({
        userId: newUser._id,
        skills: ['Pet Care'],  // Adding default skill
        availability: 'Flexible',
        experience: 'Beginner',
        location: 'Not Specified',
        contactNumber: ''
      });
      try {
        await hero.save();
        console.log('Hero profile created successfully');
      } catch (error) {
        console.error('Error creating hero profile:', error);
        throw error;
      }
    } else if (role === 'donator') {
      console.log('Creating donator profile for user:', newUser._id);
      const donator = new Donator({
        userId: newUser._id,
        petPreferences: ['Any'],  // Adding default preference
        donationType: 'Not Specified',
        address: 'Not Specified',
        contactNumber: ''
      });
      try {
        await donator.save();
        console.log('Donator profile created successfully');
      } catch (error) {
        console.error('Error creating donator profile:', error);
        throw error;
      }
    }

    let mailSent = await sendOTP(email, otp);

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

// OTP Validation
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
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

    res.status(200).json({ 
      success: true, 
      msg: 'OTP verified successfully',
      role: user.role // Send role back to client for proper redirection
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: 'Please provide both email and password'
      });
    }

    // First check if it's an admin login
    const admin = await Admin.findOne({ email });
    if (admin) {
      try {
        const isMatch = await compare(password, admin.password);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            msg: 'Invalid email or password'
          });
        }
        
        if (!admin.isActive) {
          return res.status(400).json({
            success: false,
            msg: 'Admin account is deactivated'
          });
        }

        // Set admin session
        req.session.user = {
          id: admin._id,
          role: 'admin',
          email: admin.email
        };

        return res.json({
          success: true,
          msg: 'Login successful',
          user: {
            id: admin._id,
            username: admin.username,
            role: 'admin',
            email: admin.email,
            isActive: admin.isActive
          }
        });
      } catch (error) {
        console.error('Error during admin password comparison:', error);
        return res.status(500).json({
          success: false,
          msg: 'An error occurred during login'
        });
      }
    }

    // If not admin, check regular user
  const user = await User.findOne({ email });
  if (!user) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid email or password'
      });
  }

  const isMatch = await compare(password, user.password);
  if (!isMatch) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        msg: 'Account is deactivated. Please contact support.'
      });
    }

    // Get role-specific details
    let roleDetails = null;
    if (user.role === 'hero') {
      roleDetails = await Hero.findOne({ userId: user._id })
        .select('name location contactNumber availability experience preferences fundRequests');
    } else if (user.role === 'donator') {
      roleDetails = await Donator.findOne({ userId: user._id })
        .select('petPreferences donationType address contactNumber');
    }

    // Check if role-specific profile exists
    if (!roleDetails) {
      return res.status(400).json({
        success: false,
        msg: 'User profile is incomplete. Please contact support.'
      });
    }

    res.json({
      success: true,
      msg: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
        gender: user.gender,
        isActive: user.isActive,
        roleDetails
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      msg: 'An error occurred during login. Please try again later.'
    });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    let roleDetails = null;
    if (user.role === 'hero') {
      roleDetails = await Hero.findOne({ userId: user._id });
    } else if (user.role === 'donator') {
      roleDetails = await Donator.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        gender: user.gender,
        roleDetails
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// Get user profile by email
router.post('/profile', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }

        let roleDetails = null;
        if (user.role === 'hero') {
            roleDetails = await Hero.findOne({ userId: user._id });
        } else if (user.role === 'donator') {
            roleDetails = await Donator.findOne({ userId: user._id });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                gender: user.gender,
                roleDetails
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
});

// Update user profile
router.post('/update-profile', async (req, res) => {
    try {
        const { email, name, phone, location, availability, experience, preferences } = req.body;
        
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }

        // Check if user is a hero
        if (user.role !== 'hero') {
            return res.status(403).json({ success: false, msg: 'Only hero users can update their profile' });
        }

        // Find and update hero profile
        const heroProfile = await Hero.findOne({ userId: user._id });
        if (!heroProfile) {
            return res.status(404).json({ success: false, msg: 'Hero profile not found' });
        }

        // Update hero profile
        heroProfile.name = name;
        heroProfile.contactNumber = phone;
        heroProfile.location = location;
        heroProfile.availability = availability;
        heroProfile.experience = experience;
        heroProfile.preferences = preferences;

        await heroProfile.save();

        // Update user's username if name is provided
        if (name) {
            user.username = name;
            await user.save();
        }

        res.json({
            success: true,
            msg: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                heroProfile
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
});

// Fund request route with file uploads
router.post('/fund-request', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'animalPhoto', maxCount: 1 },
    { name: 'qrCode', maxCount: 1 }
]), async (req, res) => {
    try {
        const { email, heroName, donationPurpose, itemDescription, itemLink, amountRequested } = req.body;
        
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }

        // Check if user is a hero
        if (user.role !== 'hero') {
            return res.status(403).json({ success: false, msg: 'Only hero users can submit fund requests' });
        }

        // Find hero profile
        const heroProfile = await Hero.findOne({ userId: user._id });
        if (!heroProfile) {
            return res.status(404).json({ success: false, msg: 'Hero profile not found' });
        }

        // Update hero profile with new data
        if (req.files.profilePicture) {
            heroProfile.profilePicture = req.files.profilePicture[0].filename;
            console.log('Saving profile picture:', heroProfile.profilePicture);
        }
        if (req.files.qrCode) {
            heroProfile.qrCode = req.files.qrCode[0].filename;
            console.log('Saving QR code:', heroProfile.qrCode);
        }
        heroProfile.name = heroName;

        // Create fund request
        const fundRequest = {
            purpose: donationPurpose,
            animalPhoto: req.files.animalPhoto ? req.files.animalPhoto[0].filename : null,
            itemDescription: itemDescription,
            itemLink: itemLink,
            amountRequested: parseInt(amountRequested) || 0,
            amountRaised: 0,
            daysLeft: 30,
            status: 'pending',
            createdAt: new Date()
        };

        // Add fund request to hero's requests array
        if (!heroProfile.fundRequests) {
            heroProfile.fundRequests = [];
        }
        heroProfile.fundRequests.push(fundRequest);

        await heroProfile.save();

        res.json({
            success: true,
            msg: 'Fund request submitted successfully',
            fundRequest
        });
    } catch (error) {
        console.error('Fund request error:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
});

// Get all fund requests
router.get('/fund-requests', async (req, res) => {
    try {
        // Find all heroes who have fund requests
        const heroes = await Hero.find({
            'fundRequests.0': { $exists: true }
        }).populate({
            path: 'userId',
            select: 'username email isRestricted'
        });

        console.log('Found heroes:', heroes.map(h => ({
            id: h._id,
            name: h.name,
            qrCode: h.qrCode,
            profilePicture: h.profilePicture
        })));

        // Flatten all fund requests into a single array with hero information
        const requests = heroes.reduce((allRequests, hero) => {
            if (!hero || !hero.userId) return allRequests;

            const heroRequests = hero.fundRequests.map(request => {
                if (!request) return null;

                return {
                    _id: request._id,
                    donationPurpose: request.purpose || 'No purpose specified',
                    itemDescription: request.itemDescription || 'No description available',
                    amountRequested: request.amountRequested || 0,
                    amountRaised: request.amountRaised || 0,
                    daysLeft: request.daysLeft || 30,
                    createdAt: request.createdAt || new Date(),
                    animalPhoto: request.animalPhoto || null,
                    itemLink: request.itemLink || '',
                    status: request.status || 'pending',
                    hero: {
                        _id: hero._id,
                        name: hero.name || hero.userId.username || 'Anonymous',
                        location: hero.location || 'Not specified',
                        qrCode: hero.qrCode || null,
                        profilePicture: hero.profilePicture || null,
                        user: {
                            _id: hero.userId._id,
                            username: hero.userId.username || 'Anonymous',
                            email: hero.userId.email || '',
                            isRestricted: hero.userId.isRestricted || false
                        }
                    }
                };
            }).filter(request => request !== null);

            return [...allRequests, ...heroRequests];
        }, []);

        res.json({
            success: true,
            requests: requests
        });
    } catch (error) {
        console.error('Error fetching fund requests:', error);
        res.status(500).json({
            success: false,
            msg: 'Error fetching fund requests'
        });
    }
});

module.exports = router;
