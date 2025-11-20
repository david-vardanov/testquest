const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  testCases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestCase' }],
  completionBonus: { type: Number, default: 3 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Flow', flowSchema);
