const mongoose = require('mongoose');

const seasonArchiveSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  closedAt: { type: Date, default: Date.now },
  leaderboard: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },
    position: { type: Number, required: true },
    points: { type: Number, required: true },
    reward: {
      name: { type: String },
      prizeDescription: { type: String },
      prizeAmount: { type: Number }
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('SeasonArchive', seasonArchiveSchema);
