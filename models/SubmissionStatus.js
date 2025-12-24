const mongoose = require('mongoose');

const submissionStatusSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  color: { type: String, default: '#6c757d' },
  order: { type: Number, default: 0 },
  isSystem: { type: Boolean, default: false }, // System statuses can't be deleted
  showAsColumn: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SubmissionStatus', submissionStatusSchema);
