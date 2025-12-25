const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', default: null },
  sender: { type: String, enum: ['admin', 'user'], required: true },
  content: { type: String },
  screenshot: { type: String },
  readByUser: { type: Boolean, default: false },
  readByAdmin: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Indexes for efficient queries
messageSchema.index({ user: 1, deletedAt: 1 });
messageSchema.index({ user: 1, readByUser: 1, deletedAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
