const mongoose = require('mongoose');

const testerGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  color: { type: String, default: '#6c757d' }
}, { timestamps: true });

module.exports = mongoose.model('TesterGroup', testerGroupSchema);
