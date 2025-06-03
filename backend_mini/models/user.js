const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

// Base user schema with common fields
const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  role: {
    type: String,
    enum: ['hero', 'donator'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  isRestricted: {
    type: Boolean,
    default: false
  },
  otp: String,
  otpExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hero-specific schema
const heroSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String
  },
  skills: [{
    type: String
  }],
  availability: {
    type: String
  },
  experience: {
    type: String
  },
  location: {
    type: String
  },
  contactNumber: {
    type: String
  },
  profilePicture: {
    type: String
  },
  qrCode: {
    type: String
  },
  fundRequests: [{
    purpose: {
      type: String,
      required: true
    },
    animalPhoto: {
      type: String
    },
    itemDescription: {
      type: String,
      required: true
    },
    itemLink: {
      type: String
    },
    amountRequested: {
      type: Number,
      required: true,
      default: 0
    },
    amountRaised: {
      type: Number,
      default: 0
    },
    daysLeft: {
      type: Number,
      default: 30
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Donator-specific schema
const donatorSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  petPreferences: [{
    type: String
  }],
  donationType: {
    type: String
  },
  address: {
    type: String
  },
  contactNumber: {
    type: String
  }
});

const User = model('User', userSchema);
const Hero = model('Hero', heroSchema);
const Donator = model('Donator', donatorSchema);

module.exports = { User, Hero, Donator };
