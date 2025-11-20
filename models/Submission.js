const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testCase: { type: mongoose.Schema.Types.ObjectId, ref: 'TestCase', required: true },
  flow: { type: mongoose.Schema.Types.ObjectId, ref: 'Flow' },
  status: { type: String, enum: ['passed', 'failed'], required: true },
  feedback: { type: String },
  screenshot: { type: String },
  pointsEarned: { type: Number, default: 0 },
  pointsAwarded: { type: Boolean, default: false },
  // Granular point control - which components are rejected
  rejectedPoints: {
    feedback: { type: Boolean, default: false },
    screenshot: { type: Boolean, default: false },
    bug: { type: Boolean, default: false }
  },
  isUsefulFeedback: { type: Boolean, default: false },
  adminNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
