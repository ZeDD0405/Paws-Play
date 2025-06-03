// filepath: c:\Users\riabd\Desktop\final pawsplay\PawsPlay\backend\routes\receipts.js
const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/receipts'); // Save files in the 'uploads/receipts' folder
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// POST route to handle receipt uploads
router.post('/upload', upload.single('receipt'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    res.status(200).json({
        success: true,
        message: 'Receipt uploaded successfully',
        filePath: `/uploads/receipts/${req.file.filename}`
    });
});

app.get('/api/receipts', (req, res) => {
    try {
      const receipts = JSON.parse(fs.readFileSync('receipts.json', 'utf8') || '[]');
      res.status(200).json({ success: true, data: receipts });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ success: false, message: 'Error fetching receipts' });
    }
  });

module.exports = router;