require("dotenv").config();
const express = require("express");
const cors = require("cors"); // Import CORS
const session = require("express-session");
const connectDB = require("./db");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500"], // Allow requests from your frontend
  methods: "GET,POST,PUT,DELETE",
  credentials: true // Allow cookies and authentication headers
}));

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
  })
);

// Routes
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
