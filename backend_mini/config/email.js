const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Test the connection
transporter.verify(function (error, success) {
    if (error) {
        console.log("❌ Email server connection error:", error);
    } else {
        console.log("✅ Email server is ready to send messages");
    }
});

module.exports = transporter; 