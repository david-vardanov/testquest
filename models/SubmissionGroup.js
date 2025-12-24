const mongoose = require('mongoose');

const submissionGroupSchema = new mongoose.Schema({
  name: { type: String },
  color: { type: String, default: '#6c757d' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SubmissionGroup', submissionGroupSchema);
