const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  scenario: { type: String, required: true },
  expectedResult: { type: String, required: true },
  points: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('TestCase', testCaseSchema);
