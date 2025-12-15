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
const SeasonArchive = require('../models/SeasonArchive');
const LeaderboardSettings = require('../models/LeaderboardSettings');

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
  const [flows, user, progresses, allUsers, rewards, myClaims, seasonSettings] = await Promise.all([
    Flow.find({ isActive: true }).populate('testCases'),
    User.findById(req.session.user.id),
    FlowProgress.find({ user: req.session.user.id }),
    User.find({ role: 'tester' }).sort('-points'),
    Reward.find({ isActive: true }).sort('positionFrom'),
    RewardClaim.find({ user: req.session.user.id }).populate('reward').sort('-createdAt'),
    LeaderboardSettings.findOne({ isActive: true })
  ]);

  // User not found in DB (deleted?) - destroy session and redirect to login
  if (!user) {
    req.session.destroy();
    return res.redirect('/login');
  }

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
  const leaderboard = top10.map((u, i) => {
    const pos = i + 1;
    const reward = rewards.find(r => pos >= r.positionFrom && pos <= r.positionTo);
    return {
      username: u.username,
      points: u.points,
      position: pos,
      isCurrentUser: u._id.toString() === user._id.toString(),
      reward: reward ? (reward.prizeDescription || reward.name) : '-'
    };
  });

  // If user is not in top 10, add them
  if (rank > 10) {
    const userReward = rewards.find(r => rank >= r.positionFrom && rank <= r.positionTo);
    leaderboard.push({
      username: user.username,
      points: user.points,
      position: rank,
      isCurrentUser: true,
      reward: userReward ? (userReward.prizeDescription || userReward.name) : '-'
    });
  }

  // Check if user needs tutorial
  const showTutorial = !user.hasCompletedTutorial;

  res.render('tester/dashboard', { flows, user, progressMap, rank, currentReward, nextReward, pointsToNext, myClaims, leaderboard, rewards, seasonSettings, showTutorial });
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
  const [users, currentUser, rewards] = await Promise.all([
    User.find({ role: 'tester' }).sort('-points'),
    User.findById(req.session.user.id),
    Reward.find({ isActive: true }).sort('positionFrom')
  ]);
  res.render('tester/leaderboard', { users, currentUser, rewards });
});

// Season History - list of past seasons
router.get('/history', async (req, res) => {
  const userId = req.session.user.id;
  const archives = await SeasonArchive.find().sort('-closedAt');

  // For each archive, find user's position and reward
  const seasonsWithUserData = archives.map(archive => {
    const userEntry = archive.leaderboard.find(entry =>
      entry.user && entry.user.toString() === userId
    );
    return {
      _id: archive._id,
      name: archive.name,
      closedAt: archive.closedAt,
      totalParticipants: archive.leaderboard.length,
      userPosition: userEntry ? userEntry.position : null,
      userPoints: userEntry ? userEntry.points : null,
      userReward: userEntry ? userEntry.reward : null
    };
  });

  res.render('tester/history', { seasons: seasonsWithUserData });
});

// View specific archived season
router.get('/history/:id', async (req, res) => {
  const archive = await SeasonArchive.findById(req.params.id);
  if (!archive) {
    return res.redirect('/tester/history');
  }
  const currentUserId = req.session.user.id;
  res.render('tester/history-detail', { archive, currentUserId });
});

// Tutorial - mark as complete
router.post('/tutorial/complete', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.session.user.id, { hasCompletedTutorial: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete tutorial' });
  }
});

// Practice Flow - hardcoded flow for learning
const practiceTestCases = [
  {
    id: 1,
    title: 'Verify the Login Page',
    description: 'This practice test teaches you how to complete a basic test case by following the checklist.',
    scenario: 'Look at the checklist below - these are the steps you need to verify\nClick each checkbox as you complete that step\nOnce all steps are checked, you can select "Passed"',
    expectedResult: 'You should see all checkboxes turn green\nThe "Passed" option becomes enabled\nYou understand how the checklist system works'
  },
  {
    id: 2,
    title: 'Practice Reporting a Bug',
    description: 'Sometimes you\'ll find bugs! This teaches you how to report them for bonus points.',
    scenario: 'Pretend you found a problem with the application\nSelect "Failed" in the test result section below\nWrite a description of the bug in the feedback box',
    expectedResult: 'You selected Failed which awards +3 bonus points\nYou wrote feedback describing the issue\nYou understand how bug reporting earns extra points'
  },
  {
    id: 3,
    title: 'Submit with Evidence',
    description: 'Screenshots provide visual proof. Learn how to attach them for extra points!',
    scenario: 'Take a screenshot of this page (or any image)\nClick "Choose File" and upload your screenshot\nAdd some feedback text explaining what the screenshot shows',
    expectedResult: 'Screenshot uploaded successfully (+1 point)\nFeedback provided (+1 point)\nYou understand how to maximize points on each submission'
  }
];

router.get('/practice-flow', async (req, res) => {
  const user = await User.findById(req.session.user.id);

  // Get current step from session or default to 0
  const currentStep = req.session.practiceFlowStep || 0;

  if (currentStep >= practiceTestCases.length) {
    // Practice flow complete
    return res.render('tester/practice-complete');
  }

  const testCase = practiceTestCases[currentStep];
  res.render('tester/practice-flow', {
    testCase,
    currentStep,
    totalSteps: practiceTestCases.length,
    user
  });
});

router.post('/practice-flow/submit', async (req, res) => {
  // Just advance to next step - no database interaction
  const currentStep = req.session.practiceFlowStep || 0;
  req.session.practiceFlowStep = currentStep + 1;

  if (currentStep + 1 >= practiceTestCases.length) {
    // Mark practice as complete - redirect to completion page
    return res.redirect('/tester/practice-flow/complete');
  }

  res.redirect('/tester/practice-flow');
});

router.get('/practice-flow/complete', (req, res) => {
  // Reset practice flow step for potential re-do
  req.session.practiceFlowStep = 0;
  res.render('tester/practice-complete');
});

module.exports = router;
