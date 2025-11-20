const mongoose = require('mongoose');

const rewardClaimSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
  position: { type: Number, required: true },
  points: { type: Number, required: true },
  prizeAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'claimed', 'delivered'], default: 'pending' },
  notes: { type: String },
  claimedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('RewardClaim', rewardClaimSchema);
