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
  // Optional branching question for handling path divergence
  branchingQuestion: {
    enabled: { type: Boolean, default: false },
    question: { type: String },
    options: [{
      label: { type: String },
      action: { type: String, enum: ['continue', 'reassign'] },
      targetGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'TesterGroup' }
    }]
  }
}, { timestamps: true });

module.exports = mongoose.model('TestCase', testCaseSchema);
