const mongoose = require('mongoose');

const flowProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flow: { type: mongoose.Schema.Types.ObjectId, ref: 'Flow', required: true },
  completedTestCases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestCase' }],
  isCompleted: { type: Boolean, default: false },
  bonusAwarded: { type: Boolean, default: false }
}, { timestamps: true });

flowProgressSchema.index({ user: 1, flow: 1 }, { unique: true });

module.exports = mongoose.model('FlowProgress', flowProgressSchema);
