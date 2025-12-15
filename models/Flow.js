const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  testCases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestCase' }],
  points: { type: Number, default: 0 },           // Points displayed for this flow (e.g., 50)
  completionBonus: { type: Number, default: 3 },  // Bonus points awarded when flow is completed
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Flow', flowSchema);
