// Start the server
const PORT = 5000;
require("dotenv").config();
const express = require("express");
const cors = require("cors"); // Import CORS
const session = require("express-session");
const connectDB = require("./db");
const userRoutes = require("./routes/userRoutes");
const path = require("path");
const { User } = require("./models/user");
const Admin = require("./models/admin");
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs'); // Import fs for file system operations
const app = express();
const multer = require('multer');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'uploads');
const receiptsDir = path.join(uploadDir, 'receipts');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir);

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Save all files in the receipts directory
      cb(null, receiptsDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
});

// Enable CORS for all routes
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5000"], // Allow requests from your frontend
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Add PATCH to allowed methods
  credentials: true, // Allow cookies and authentication headers
  allowedHeaders: ["Content-Type", "Authorization"] // Add any other headers you need
}));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Routes
app.use("/api/users", userRoutes);

// Add fund-requests route
app.get('/api/fund-requests', async (req, res) => {
    try {
        // Find all heroes with their fund requests
        const heroes = await Hero.find().populate('userId');

        // Get all fund requests from heroes
        const requests = [];
        for (const hero of heroes) {
            if (hero.fundRequests && hero.fundRequests.length > 0) {
                hero.fundRequests.forEach(request => {
                    requests.push({
                        _id: request._id,
                        donationPurpose: request.purpose,
                        itemDescription: request.itemDescription,
                        amountRequested: request.amountRequested,
                        amountRaised: request.amountRaised || 0,
                        daysLeft: request.daysLeft || 30,
                        createdAt: request.createdAt,
                        animalPhoto: request.animalPhoto,
                        itemLink: request.itemLink,
                        status: request.status,
                        hero: {
                            _id: hero._id,
                            name: hero.name || hero.userId.username,
                            location: hero.location || 'Not specified',
                            user: {
                                _id: hero.userId._id,
                                username: hero.userId.username,
                                email: hero.userId.email,
                                isRestricted: hero.userId.isRestricted || false
                            }
                        }
                    });
                });
            }
        }

        res.json({
            success: true,
            requests: requests
        });
    } catch (error) {
        console.error('Error fetching fund requests:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching fund requests'
        });
    }
});

// Admin endpoint to get user statistics and information
app.get('/api/admin/users', async (req, res) => {
    try {
        // Get all users
        const users = await User.find({}, 'username email role createdAt isActive isStarred isRestricted');
        
        // Calculate statistics
        const totalUsers = users.length;
        const heroUsers = users.filter(user => user.role === 'hero').length;
        const donorUsers = users.filter(user => user.role === 'donator').length;

        res.json({
            success: true,
            totalUsers,
            heroUsers,
            donorUsers,
            users: users.map(user => ({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                isActive: user.isActive,
                isStarred: user.isStarred || false,
                isRestricted: user.isRestricted || false
            }))
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user data'
        });
    }
});

// Toggle starred status for donor users
app.post('/api/admin/toggle-starred', async (req, res) => {
    try {
        const { userId, isStarred } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role !== 'donator') {
            return res.status(400).json({ success: false, message: 'Only donor users can be starred' });
        }

        user.isStarred = isStarred;
        await user.save();

        res.json({ success: true, message: 'Starred status updated successfully' });
    } catch (error) {
        console.error('Error toggling starred status:', error);
        res.status(500).json({ success: false, message: 'Error updating starred status' });
    }
});

// Toggle restricted status for hero users
app.post('/api/admin/toggle-restricted', async (req, res) => {
    try {
        const { userId, isRestricted } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role !== 'hero') {
            return res.status(400).json({ success: false, message: 'Only hero users can be restricted' });
        }

        user.isRestricted = isRestricted;
        await user.save();

        res.json({ success: true, message: 'Restricted status updated successfully' });
    } catch (error) {
        console.error('Error toggling restricted status:', error);
        res.status(500).json({ success: false, message: 'Error updating restricted status' });
    }
});

// Default admin credentials
const DEFAULT_ADMIN_EMAIL = 'admin@pawsplay.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';
const DEFAULT_ADMIN_USERNAME = 'Admin';

// Create default admin user if it doesn't exist
async function createDefaultAdmin() {
    try {
        const adminExists = await Admin.findOne({ email: DEFAULT_ADMIN_EMAIL });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
            const adminUser = new Admin({
                username: DEFAULT_ADMIN_USERNAME,
                email: DEFAULT_ADMIN_EMAIL,
                password: hashedPassword,
                isActive: true
            });
            await adminUser.save();
            console.log('✅ Default admin user created successfully');
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}


const startServer = async () => {
  try {
    await createDefaultAdmin();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

//const multer = require("multer"); // Import multer for file uploads

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads/receipts")); // Save files in 'uploads/receipts'
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
  },
});

// Removed duplicate declaration of 'upload' as it was already declared earlier
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post("/api/admin/receipts/upload", upload.single("receipt"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
  
      const receipt = {
        userEmail: req.body.userEmail,
        purpose: req.body.donationPurpose,
        filePath: `/uploads/receipts/${req.file.filename}`,
        uploadedAt: new Date(),
      };
  
      let receipts = [];
      try {
        const fileContent = fs.readFileSync("receipts.json", "utf8");
        receipts = fileContent ? JSON.parse(fileContent) : [];
      } catch (error) {
        console.warn("receipts.json not found or empty, initializing a new one.");
      }
  
      receipts.push(receipt);
      fs.writeFileSync("receipts.json", JSON.stringify(receipts, null, 2));
  
      res.status(200).json({
        success: true,
        message: "Receipt uploaded successfully!",
        receipt,
      });
    } catch (error) {
      console.error("Error uploading receipt:", error);
      res.status(500).json({ success: false, message: "Error uploading receipt" });
    }
});
  
// Fetch receipts route
app.get("/api/receipts", (req, res) => {
  try {
    const receipts = JSON.parse(fs.readFileSync("receipts.json", "utf8") || "[]");
    res.status(200).json({ success: true, data: receipts });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ success: false, message: "Error fetching receipts" });
  }
});
  
app.get("/admin", (req, res) => {
  console.log(path.join(__dirname, "../admin.html")); // Debug the resolved path
  res.sendFile(path.join(__dirname, "../admin.html"));
});
            
app.use("/uploads", (req, res, next) => {
  console.log("Static file request:", req.url);
  next();
}, express.static(path.join(__dirname, "uploads/receipts")));

const adminRoutes = require('./routes/admin'); // Import the admin routes

// Middleware to parse JSON
app.use(express.json());

// Use the admin routes
app.use('/api/admin', adminRoutes);



// Route to handle file uploads
app.post('/api/upload-payment', upload.single('paymentScreenshot'), (req, res) => {
  try {
      const { userEmail, userRole, donationPurpose } = req.body;

      const filePath = `/uploads/receipts/${req.file.filename}`;

      // Create a receipt object
      const receipt = {
          userEmail,
          filePath,
          uploadedAt: new Date(),
          userRole,
          donationPurpose
      };

      // Read the existing donor receipts from donorreceipts.json
      let donorReceipts = [];
      try {
          const fileContent = fs.readFileSync('donorreceipts.json', 'utf8');
          donorReceipts = fileContent ? JSON.parse(fileContent) : [];
      } catch (error) {
          console.warn('donorreceipts.json not found or empty, initializing a new one.');
      }

      // Add the new receipt to the array
      donorReceipts.push(receipt);

      // Write the updated array back to donorreceipts.json
      fs.writeFileSync('donorreceipts.json', JSON.stringify(donorReceipts, null, 2));

      res.status(200).json({
          success: true,
          message: 'Receipt uploaded successfully!',
          receipt,
      });
  } catch (error) {
      console.error('Error uploading receipt:', error);
      res.status(500).json({ success: false, message: 'Error uploading receipt' });
  }
});

app.get('/api/donor-receipts', (req, res) => {
    try {
        const donorReceipts = JSON.parse(fs.readFileSync('donorreceipts.json', 'utf8'));
        console.log("Donor Receipts Data:", donorReceipts); // Debugging log
        res.status(200).json({ success: true, data: donorReceipts });
    } catch (error) {
        console.error("Error fetching donor receipts:", error);
        res.status(500).json({ success: false, message: "Error fetching donor receipts." });
    }
});

app.post('/api/upload-payment', upload.single('paymentScreenshot'), (req, res) => {
  try {
      const { fundRequestId, userRole, userEmail } = req.body; // Ensure these fields are sent from the frontend
      const filePath = `/uploads/${req.file.filename}`; // Path to the uploaded file

      // Create a receipt object
      const receipt = {
          userEmail,
          filePath,
          uploadedAt: new Date(),
          donationPurpose,
          userRole // Ensure this is set to "donator"
      };

      // Read the existing donor receipts from donorreceipts.json
      let donorReceipts = [];
      try {
          const fileContent = fs.readFileSync("donorreceipts.json", "utf8");
          donorReceipts = fileContent ? JSON.parse(fileContent) : [];
      } catch (error) {
          console.warn("donorreceipts.json not found or empty, initializing a new one.");
      }

      // Add the new receipt to the array
      donorReceipts.push(receipt);

      // Write the updated array back to donorreceipts.json
      fs.writeFileSync("donorreceipts.json", JSON.stringify(donorReceipts, null, 2));

      // Respond with success
      res.status(200).json({
          success: true,
          message: "Receipt uploaded successfully!",
          receipt,
      });
  } catch (error) {
      console.error("Error uploading receipt:", error);
      res.status(500).json({ success: false, message: "Error uploading receipt" });
  }
});

// Other routes...

// Route to fetch donor receipts
app.get('/api/donor-receipts', (req, res) => {
  try {
      console.log("Fetching donor receipts...");
      const donorReceipts = JSON.parse(fs.readFileSync("donorreceipts.json", "utf8"));
      res.status(200).json({ success: true, data: donorReceipts });
  } catch (error) {
      console.error("Error fetching donor receipts:", error);
      res.status(500).json({ success: false, message: "Error fetching donor receipts" });
  }
});
app.post("/api/update-progress", (req, res) => {
  const { donationPurpose, donationAmount } = req.body;

  try {
    const fundRequests = JSON.parse(fs.readFileSync("fundRequests.json", "utf8"));

    const cause = fundRequests.find((request) => request.donationPurpose === donationPurpose);

    if (!cause) {
      return res.status(404).json({ success: false, message: "Cause not found." });
    }

    cause.amountRaised = (cause.amountRaised || 0) + donationAmount;

    fs.writeFileSync("fundRequests.json", JSON.stringify(fundRequests, null, 2));

    res.status(200).json({ success: true, message: "Progress updated successfully." });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ success: false, message: "Error updating progress." });
  }
});

app.get('/api/admin/donor-receipts', (req, res) => {
  try {
      const donorReceipts = JSON.parse(fs.readFileSync('donorreceipts.json', 'utf8'));
      res.status(200).json({ success: true, data: donorReceipts });
  } catch (error) {
      console.error('Error fetching donor receipts:', error);
      res.status(500).json({ success: false, message: 'Error fetching donor receipts' });
  }
});

async function updateProgressBars() {
  try {
      const response = await fetch("http://localhost:5000/api/causes");
      const data = await response.json();

      if (data.success) {
          const causesContainer = document.getElementById("causesContainer");
          causesContainer.innerHTML = data.causes
              .map(
                  (cause) => `
                  <div class="cause-card">
                      <h3>${cause.name}</h3>
                      <p>${cause.description}</p>
                      <div class="progress-bar-container">
                          <div class="progress-bar" style="width: ${(cause.amountRaised / cause.amountRequested) * 100}%;"></div>
                      </div>
                      <p>Raised: $${cause.amountRaised} / $${cause.amountRequested}</p>
                  </div>
              `
              )
              .join("");
      } else {
          console.error("Failed to load causes:", data.message);
      }
  } catch (error) {
      console.error("Error loading causes:", error);
  }
}

const { Hero } = require('./models/user');
app.get('/api/causes', async (req, res) => {
  try {
      const heroes = await Hero.find(); // or any query that suits
      const allRequests = heroes.flatMap(hero => hero.fundRequests);
      res.json({ success: true, causes: allRequests });
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// try {
//     res.json({ success: true, causes: allCauses });
// } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: 'Failed to load causes' });
// }

app.post('/api/causes', (req, res) => {
  try {
      const { name, description, amountRequested, amountRaised, animalPhoto, hero } = req.body;

      if (!name || !description || !amountRequested) {
          return res.status(400).json({ success: false, message: "Missing required fields." });
      }

      const causesPath = path.join(__dirname, 'causes.json');
      let causes = [];

      // Read existing causes
      if (fs.existsSync(causesPath)) {
          causes = JSON.parse(fs.readFileSync(causesPath, 'utf8'));
      }

      // Check if the cause already exists
      if (causes.find((cause) => cause.name === name)) {
          return res.status(400).json({ success: false, message: "Cause with this name already exists." });
      }

      // Add the new cause
      const newCause = {
          name,
          description,
          amountRequested,
          amountRaised: amountRaised || 0,
          animalPhoto: animalPhoto || null,
          hero: hero || null
      };
      causes.push(newCause);

      // Save updated causes to causes.json
      fs.writeFileSync(causesPath, JSON.stringify(causes, null, 2));

      res.status(201).json({ success: true, message: "Cause added successfully!", cause: newCause });
  } catch (error) {
      console.error("Error adding cause:", error);
      res.status(500).json({ success: false, message: "Error adding cause." });
  }
});


app.post('/api/fund-requests', upload.single('animalPhoto'), async (req, res) => {
  try {
    console.log('Form data:', req.body, 'File:', req.file);
    const fundRequest = new FundRequest({
      donationPurpose: req.body.donationPurpose,
      itemDescription: req.body.itemDescription,
      amountRequested: req.body.amountRequested,
      animalPhoto: req.file ? req.file.filename : null,
      hero: {
        name: req.body.heroName,
        location: req.body.heroLocation,
      },
    });
    const savedFundRequest = await fundRequest.save();
    console.log('Saved to MongoDB:', savedFundRequest);
    res.status(201).json(savedFundRequest);
  } catch (error) {
    console.error('Error saving fund request:', error);
    res.status(400).json({ message: error.message });
  }
});
app.patch('/api/fund-requests/:fundRequestId/confirm-donation', async (req, res) => {
    const { fundRequestId } = req.params;
    const { amount } = req.body;

    try {
        // Find the hero with the matching fund request
        const hero = await Hero.findOne({ 'fundRequests._id': fundRequestId });

        if (!hero) {
            return res.status(404).json({ 
                success: false, 
                message: 'Fund request not found' 
            });
        }

        // Find the specific fund request and update amountRaised
        const fundRequest = hero.fundRequests.id(fundRequestId);
        if (!fundRequest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Fund request not found in hero document' 
            });
        }

        // Update the amount raised
        fundRequest.amountRaised = (fundRequest.amountRaised || 0) + Number(amount);

        // Save the updated hero document
        await hero.save();

        // Return success response
        res.json({ 
            success: true, 
            message: 'Donation confirmed successfully',
            updatedRequest: {
                _id: fundRequest._id,
                purpose: fundRequest.purpose,
                amountRequested: fundRequest.amountRequested,
                amountRaised: fundRequest.amountRaised,
                status: fundRequest.status
            }
        });
    } catch (error) {
        console.error('Error confirming donation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error confirming donation',
            error: error.message 
        });
    }
});


app.get('/admin', async (req, res) => {
  try {
      // Fetch the necessary data (e.g., requests and user info)
      const requests = await Request.find(); // Replace with your actual query
      const user = req.user; // Assuming `req.user` contains the logged-in admin's info

      // Render the admin.html template with the data
      res.render('admin', { requests, user });
  } catch (error) {
      console.error('Error loading admin page:', error);
      res.status(500).send('Server error');
  }
});

app.delete('/api/fund-requests/:name', (req, res) => {
  try {
      const { name } = req.params;

      // Read the existing causes
      const causes = JSON.parse(fs.readFileSync('causes.json', 'utf8'));

      // Filter out the cause to be deleted
      const updatedCauses = causes.filter((cause) => cause.name !== name);

      // Save the updated causes back to the file
      fs.writeFileSync('causes.json', JSON.stringify(updatedCauses, null, 2));

      res.status(200).json({ success: true, message: "Fund request deleted successfully." });
  } catch (error) {
      console.error("Error deleting fund request:", error);
      res.status(500).json({ success: false, message: "Error deleting fund request." });
  }
});

app.get('/api/sync-causes', (req, res) => {
  try {
      // Read donor receipts
      const donorReceiptsPath = path.join(__dirname, 'donorreceipts.json');
      const donorReceipts = JSON.parse(fs.readFileSync(donorReceiptsPath, 'utf8'));

      // Read causes
      const causesPath = path.join(__dirname, 'causes.json');
      let causes = [];
      if (fs.existsSync(causesPath)) {
          causes = JSON.parse(fs.readFileSync(causesPath, 'utf8'));
      }

      // Update causes based on donor receipts
      donorReceipts.forEach((receipt) => {
          const { donationPurpose } = receipt;

          // Check if the cause already exists in causes.json
          let cause = causes.find((c) => c.name === donationPurpose);

          if (!cause) {
              // If the cause doesn't exist, add it
              causes.push({
                  name: donationPurpose,
                  description: `Support for ${donationPurpose}`,
                  amountRequested: 1000, // Default value, adjust as needed
                  amountRaised: 0, // Default value
              });
          }
      });
      app.get('/api/fund-requests', async (req, res) => {
        try {
          const fundRequests = await FundRequest.find();
          console.log('Fetched fund requests:', fundRequests);
          res.json(fundRequests);
        } catch (error) {
          console.error('Error fetching fund requests:', error);
          res.status(500).json({ message: error.message });
        }
      });
      // Write updated causes to causes.json
      fs.writeFileSync(causesPath, JSON.stringify(causes, null, 2));

      res.status(200).json({ success: true, message: "Causes synced successfully!", causes });
  } catch (error) {
      console.error("Error syncing causes:", error);
      res.status(500).json({ success: false, message: "Error syncing causes." });
  }
});

const { Heros } = require('./models/user'); //PLS SEE IF GADBAD

app.post('/api/admin/confirm-donation', async (req, res) => {
  try {
    const { requestId, amount, role } = req.body;
    console.log('Received confirmation:', { requestId, amount, role });

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid requestId' });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Admin role required' });
    }

    // Update fund request
    const fundRequest = await FundRequest.findById(requestId);
    if (!fundRequest) {
      return res.status(404).json({ message: 'Fund request not found' });
    }
    fundRequest.amountRaised = (fundRequest.amountRaised || 0) + Number(amount);
    await fundRequest.save();

    res.json({ message: 'Donation confirmed', fundRequest });
  } catch (error) {
    console.error('Error confirming donation:', error);
    res.status(400).json({ message: 'Invalid data provided' });
  }
});

// Start the server
// Removed duplicate declaration of PORT

//app.listen(PORT, () => {
    //console.log(`Server running on http://localhost:${PORT}`);
//});




startServer();

// Add this after your other routes
app.post('/api/admin/verify-receipt', async (req, res) => {
    try {
        const { filePath, userEmail, verifiedAt } = req.body;

        // Read the existing verified receipts
        let verifiedReceipts = [];
        try {
            const fileContent = fs.readFileSync('verified-receipts.json', 'utf8');
            verifiedReceipts = fileContent ? JSON.parse(fileContent) : [];
        } catch (error) {
            console.warn('verified-receipts.json not found or empty, initializing a new one.');
        }

        // Add the new verified receipt
        verifiedReceipts.push({
            filePath,
            userEmail,
            verifiedAt,
            status: 'verified'
        });

        // Save the updated verified receipts
        fs.writeFileSync('verified-receipts.json', JSON.stringify(verifiedReceipts, null, 2));

        res.status(200).json({
            success: true,
            message: 'Receipt verified successfully'
        });
    } catch (error) {
        console.error('Error verifying receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying receipt'
        });
    }
});

// Add endpoint to get verified receipts
app.get('/api/verified-receipts', (req, res) => {
    try {
        const verifiedReceipts = JSON.parse(fs.readFileSync('verified-receipts.json', 'utf8') || '[]');
        res.status(200).json({
            success: true,
            data: verifiedReceipts
        });
    } catch (error) {
        console.error('Error fetching verified receipts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching verified receipts'
        });
    }
});
