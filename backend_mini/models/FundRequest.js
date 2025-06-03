const mongoose = require('mongoose');

const fundRequestSchema = new mongoose.Schema({
  donationPurpose: { type: String, required: true },
  itemDescription: String,
  amountRequested: Number,
  amountRaised: { type: Number, default: 0 },
  animalPhoto: String,
  hero: {
    name: String,
    location: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FundRequest', fundRequestSchema);
