import express from 'express';
import { createTransport } from 'nodemailer';
import { Schema, model, connect } from 'mongoose';
import { json } from 'body-parser';
import crypto from 'crypto';

const app = express();
app.use(json());

// MongoDB User Schema
const userSchema = new Schema({
    username: String,
    gender: String,
    email: String,
    password: String,
    role: String,
    otp: String,
    otpExpires: Date,
});

const User = model('User', userSchema);

// MongoDB Connection
connect('<Your MongoDB Atlas Connection String>', { useNewUrlParser: true, useUnifiedTopology: true });

// Nodemailer Configuration
const transporter = createTransport({
    service: 'gmail',
    auth: {
        user: 'pawsplay927@gmail.com',
        pass: 'ssrj1234',
    },
});

// Generate and Send OTP
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, gender, email, password, role } = req.body;

        // Check if the email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already exists' });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

        // Send OTP via email
        await transporter.sendMail({
            from: 'pawsplay927@gmail.com',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
        });

        // Save user to database with OTP
        const newUser = new User({ username, gender, email, password, role, otp, otpExpires });
        await newUser.save();

        res.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify OTP
app.post('/api/users/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        // Check if OTP matches and hasn't expired
        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Clear OTP fields after successful verification
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start Server
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
