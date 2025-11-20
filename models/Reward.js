const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  // Position-based: top X users get this reward
  positionFrom: { type: Number, required: true }, // e.g., 1
  positionTo: { type: Number, required: true },   // e.g., 3 (positions 1-3)
  prizeAmount: { type: Number, default: 0 },      // monetary value
  prizeDescription: { type: String },             // e.g., "$100 Amazon Gift Card"
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);
