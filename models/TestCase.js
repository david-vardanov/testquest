const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  scenario: { type: String, required: true },
  expectedResult: { type: String, required: true },
  points: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  // Group visibility - empty array means visible to ALL groups
  visibleToGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TesterGroup' }],
  // Auto-reassign user to another group when they fail this test case
  reassignOnFail: {
    enabled: { type: Boolean, default: false },
    targetGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'TesterGroup' }
  }
}, { timestamps: true });

module.exports = mongoose.model('TestCase', testCaseSchema);
