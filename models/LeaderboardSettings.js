const mongoose = require('mongoose');

const leaderboardSettingsSchema = new mongoose.Schema({
  name: { type: String, default: 'Current Season' },
  budget: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LeaderboardSettings', leaderboardSettingsSchema);
