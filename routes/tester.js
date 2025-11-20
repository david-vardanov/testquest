const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { isLoggedIn } = require('../middleware/auth');
const User = require('../models/User');
const Flow = require('../models/Flow');
const Submission = require('../models/Submission');
const FlowProgress = require('../models/FlowProgress');
const Reward = require('../models/Reward');
const RewardClaim = require('../models/RewardClaim');

// Multer config for screenshots
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.use(isLoggedIn);

// Dashboard - show available flows
router.get('/', async (req, res) => {
  const [flows, user, progresses, allUsers, rewards, myClaims] = await Promise.all([
    Flow.find({ isActive: true }).populate('testCases'),
    User.findById(req.session.user.id),
    FlowProgress.find({ user: req.session.user.id }),
    User.find({ role: 'tester' }).sort('-points'),
    Reward.find({ isActive: true }).sort('positionFrom'),
    RewardClaim.find({ user: req.session.user.id }).populate('reward').sort('-createdAt')
  ]);

  const progressMap = {};
  progresses.forEach(p => progressMap[p.flow.toString()] = p);

  // Calculate user's rank
  const rank = allUsers.findIndex(u => u._id.toString() === user._id.toString()) + 1;

  // Find what reward they'd get at current rank
  const currentReward = rewards.find(r => rank >= r.positionFrom && rank <= r.positionTo);

  // Find next reward tier to aim for
  const nextReward = rewards.find(r => r.positionTo < rank);
  const nextRankNeeded = nextReward ? nextReward.positionTo : null;
  const pointsToNext = nextRankNeeded && allUsers[nextRankNeeded - 1] ? allUsers[nextRankNeeded - 1].points - user.points + 1 : null;

  // Build leaderboard: top 10, plus user if not in top 10
  const top10 = allUsers.slice(0, 10);
  const leaderboard = top10.map((u, i) => ({
    username: u.username,
    points: u.points,
    position: i + 1,
    isCurrentUser: u._id.toString() === user._id.toString()
  }));

  // If user is not in top 10, add them
  if (rank > 10) {
    leaderboard.push({
      username: user.username,
      points: user.points,
      position: rank,
      isCurrentUser: true
    });
  }

  res.render('tester/dashboard', { flows, user, progressMap, rank, currentReward, nextReward, pointsToNext, myClaims, leaderboard, rewards });
});

// Start/Continue a flow
router.get('/flow/:id', async (req, res) => {
  const flow = await Flow.findById(req.params.id).populate('testCases');
  if (!flow) return res.redirect('/tester');

  let progress = await FlowProgress.findOne({ user: req.session.user.id, flow: flow._id });
  if (!progress) {
    progress = await FlowProgress.create({ user: req.session.user.id, flow: flow._id, completedTestCases: [] });
  }

  // Find next incomplete test case
  const nextTestCase = flow.testCases.find(tc => !progress.completedTestCases.includes(tc._id.toString()));

  if (!nextTestCase) {
    return res.render('tester/flow-complete', { flow, progress });
  }

  res.render('tester/test', { flow, testCase: nextTestCase, progress });
});

// Submit test result
router.post('/flow/:flowId/submit/:testCaseId', upload.single('screenshot'), async (req, res) => {
  const { status, feedback } = req.body;
  const { flowId, testCaseId } = req.params;
  const userId = req.session.user.id;

  // Calculate potential points (not awarded yet)
  let points = 1; // base point for completing
  if (status === 'failed') points += 3; // extra for finding bugs
  if (feedback && feedback.trim()) points += 1;
  if (req.file) points += 1;

  // Create submission (points pending admin approval)
  await Submission.create({
    user: userId,
    testCase: testCaseId,
    flow: flowId,
    status,
    feedback,
    screenshot: req.file ? req.file.filename : null,
    pointsEarned: points,
    pointsAwarded: false
  });

  // Update flow progress (test case is completed, but points pending)
  const progress = await FlowProgress.findOne({ user: userId, flow: flowId });
  if (!progress.completedTestCases.includes(testCaseId)) {
    progress.completedTestCases.push(testCaseId);
    await progress.save();
  }

  // Check if flow is complete (bonus also pending approval)
  const flow = await Flow.findById(flowId);
  if (progress.completedTestCases.length >= flow.testCases.length && !progress.isCompleted) {
    progress.isCompleted = true;
    await progress.save();
  }

  res.redirect(`/tester/flow/${flowId}`);
});

// My submissions
router.get('/submissions', async (req, res) => {
  const submissions = await Submission.find({ user: req.session.user.id })
    .sort('-createdAt')
    .populate('testCase flow');
  res.render('tester/submissions', { submissions });
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  const users = await User.find({ role: 'tester' }).sort('-points').limit(50);
  const currentUser = await User.findById(req.session.user.id);
  res.render('tester/leaderboard', { users, currentUser });
});

module.exports = router;
