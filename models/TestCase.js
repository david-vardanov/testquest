const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  scenario: { type: String, required: true },
  expectedResult: { type: String, required: true },
  points: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  // Hidden cases only appear when unlocked via reassignOnFail
  isHidden: { type: Boolean, default: false },
  // Group visibility - empty array means visible to ALL groups
  visibleToGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TesterGroup' }],
  // Unlock a specific test case for the user when they fail this test case
  reassignOnFail: {
    enabled: { type: Boolean, default: false },
    targetTestCase: { type: mongoose.Schema.Types.ObjectId, ref: 'TestCase' }
  }
}, { timestamps: true });

module.exports = mongoose.model('TestCase', testCaseSchema);
