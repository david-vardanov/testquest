const express = require('express');
const router = express.Router();
const multer = require('multer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const TestCase = require('../models/TestCase');
const Flow = require('../models/Flow');
const Submission = require('../models/Submission');
const Reward = require('../models/Reward');
const RewardClaim = require('../models/RewardClaim');
const LeaderboardSettings = require('../models/LeaderboardSettings');

// Ensure backups directory exists
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

router.use(isAdmin);

// Leaderboard/Rankings
router.get('/rankings', async (req, res) => {
  const [users, rewards] = await Promise.all([
    User.find({ role: 'tester' }).sort('-points').limit(50),
    Reward.find({ isActive: true }).sort('positionFrom')
  ]);
  res.render('admin/rankings', { users: users || [], rewards: rewards || [] });
});

// Dashboard
router.get('/', async (req, res) => {
  const [users, testCases, flows, submissions] = await Promise.all([
    User.countDocuments({ role: 'tester' }),
    TestCase.countDocuments(),
    Flow.countDocuments(),
    Submission.find().sort('-createdAt').limit(10).populate('user testCase')
  ]);
  res.render('admin/dashboard', { stats: { users, testCases, flows }, recentSubmissions: submissions });
});

// Users CRUD
router.get('/users', async (req, res) => {
  const users = await User.find({ role: 'tester' }).sort('-createdAt');
  res.render('admin/users', { users });
});

router.get('/users/new', (req, res) => {
  res.render('admin/users-form', { user: null });
});

router.post('/users', async (req, res) => {
  const { username, email, password, isActive } = req.body;
  await User.create({ username, email, password, role: 'tester', isActive: isActive === 'on' });
  res.redirect('/admin/users');
});

router.get('/users/:id/edit', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render('admin/users-form', { user });
});

router.post('/users/:id', async (req, res) => {
  const { username, email, password, isActive } = req.body;
  const update = { username, email, isActive: isActive === 'on' };
  if (password) update.password = password;
  const user = await User.findById(req.params.id);
  Object.assign(user, update);
  await user.save();
  res.redirect('/admin/users');
});

router.post('/users/:id/delete', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/admin/users');
});

// Test Cases CRUD
router.get('/testcases', async (req, res) => {
  const testCases = await TestCase.find().sort('-createdAt');
  res.render('admin/testcases', { testCases });
});

router.get('/testcases/new', (req, res) => {
  res.render('admin/testcases-form', { testCase: null });
});

router.post('/testcases', async (req, res) => {
  const { title, description, scenario, expectedResult, points, isActive } = req.body;
  await TestCase.create({ title, description, scenario, expectedResult, points, isActive: isActive === 'on' });
  res.redirect('/admin/testcases');
});

router.get('/testcases/:id/edit', async (req, res) => {
  const testCase = await TestCase.findById(req.params.id);
  res.render('admin/testcases-form', { testCase });
});

router.post('/testcases/:id', async (req, res) => {
  const { title, description, scenario, expectedResult, points, isActive } = req.body;
  await TestCase.findByIdAndUpdate(req.params.id, { title, description, scenario, expectedResult, points, isActive: isActive === 'on' });
  res.redirect('/admin/testcases');
});

router.post('/testcases/:id/delete', async (req, res) => {
  await TestCase.findByIdAndDelete(req.params.id);
  res.redirect('/admin/testcases');
});

// Flows CRUD
router.get('/flows', async (req, res) => {
  const flows = await Flow.find().populate('testCases').sort('-createdAt');
  res.render('admin/flows', { flows });
});

router.get('/flows/new', async (req, res) => {
  const allTestCases = await TestCase.find({ isActive: true }).sort('-createdAt');
  res.render('admin/flows-form', { flow: null, allTestCases });
});

router.post('/flows', async (req, res) => {
  const { name, description, testCases, completionBonus, isActive } = req.body;

  // Create or reuse test cases
  const testCaseIds = [];
  if (testCases && Array.isArray(testCases)) {
    for (const tc of testCases) {
      if (tc.isReused === 'true' && tc.reusedId) {
        // Reuse existing test case
        testCaseIds.push(tc.reusedId);
      } else if (tc.title && tc.scenario) {
        // Create new test case
        const created = await TestCase.create({
          title: tc.title,
          description: tc.description,
          scenario: tc.scenario,
          expectedResult: tc.expectedResult,
          points: tc.points || 1,
          isActive: true
        });
        testCaseIds.push(created._id);
      }
    }
  }

  await Flow.create({
    name, description,
    testCases: testCaseIds,
    completionBonus,
    isActive: isActive === 'on'
  });
  res.redirect('/admin/flows');
});

router.get('/flows/:id/edit', async (req, res) => {
  const [flow, allTestCases] = await Promise.all([
    Flow.findById(req.params.id).populate('testCases'),
    TestCase.find({ isActive: true }).sort('-createdAt')
  ]);
  res.render('admin/flows-form', { flow, allTestCases });
});

router.post('/flows/:id', async (req, res) => {
  const { name, description, testCases, completionBonus, isActive } = req.body;

  const flow = await Flow.findById(req.params.id);
  const newTestCaseIds = [];
  const keptIds = [];

  if (testCases && Array.isArray(testCases)) {
    for (const tc of testCases) {
      if (tc.isReused === 'true' && tc.reusedId) {
        // Reuse existing test case
        newTestCaseIds.push(tc.reusedId);
        keptIds.push(tc.reusedId);
      } else if (tc.title && tc.scenario) {
        if (tc.id) {
          // Update existing test case
          await TestCase.findByIdAndUpdate(tc.id, {
            title: tc.title,
            description: tc.description,
            scenario: tc.scenario,
            expectedResult: tc.expectedResult,
            points: tc.points || 1
          });
          newTestCaseIds.push(tc.id);
          keptIds.push(tc.id);
        } else {
          // Create new test case
          const created = await TestCase.create({
            title: tc.title,
            description: tc.description,
            scenario: tc.scenario,
            expectedResult: tc.expectedResult,
            points: tc.points || 1,
            isActive: true
          });
          newTestCaseIds.push(created._id);
        }
      }
    }
  }

  await Flow.findByIdAndUpdate(req.params.id, {
    name, description,
    testCases: newTestCaseIds,
    completionBonus,
    isActive: isActive === 'on'
  });
  res.redirect('/admin/flows');
});

router.post('/flows/:id/delete', async (req, res) => {
  const flow = await Flow.findById(req.params.id);
  // Delete associated test cases
  if (flow.testCases) {
    await TestCase.deleteMany({ _id: { $in: flow.testCases } });
  }
  await Flow.findByIdAndDelete(req.params.id);
  res.redirect('/admin/flows');
});

// Leaderboard Settings & Rewards
router.post('/leaderboard/settings', async (req, res) => {
  const { name, budget, startDate, endDate } = req.body;
  let settings = await LeaderboardSettings.findOne({ isActive: true });
  if (settings) {
    settings.name = name;
    settings.budget = budget;
    settings.startDate = startDate || null;
    settings.endDate = endDate || null;
    await settings.save();
  } else {
    await LeaderboardSettings.create({ name, budget, startDate, endDate });
  }
  res.redirect('/admin/leaderboard');
});

// Rewards CRUD
router.get('/rewards', async (req, res) => {
  const rewards = await Reward.find().sort('positionFrom');
  res.render('admin/rewards', { rewards });
});

router.get('/rewards/new', (req, res) => {
  res.render('admin/rewards-form', { reward: null });
});

router.post('/rewards', async (req, res) => {
  const { name, description, positionFrom, positionTo, prizeAmount, prizeDescription, isActive } = req.body;
  await Reward.create({ name, description, positionFrom, positionTo, prizeAmount, prizeDescription, isActive: isActive === 'on' });
  res.redirect('/admin/rewards');
});

router.get('/rewards/:id/edit', async (req, res) => {
  const reward = await Reward.findById(req.params.id);
  res.render('admin/rewards-form', { reward });
});

router.post('/rewards/:id', async (req, res) => {
  const { name, description, positionFrom, positionTo, prizeAmount, prizeDescription, isActive } = req.body;
  await Reward.findByIdAndUpdate(req.params.id, { name, description, positionFrom, positionTo, prizeAmount, prizeDescription, isActive: isActive === 'on' });
  res.redirect('/admin/rewards');
});

router.post('/rewards/:id/delete', async (req, res) => {
  await Reward.findByIdAndDelete(req.params.id);
  res.redirect('/admin/rewards');
});

// Award rewards to top users
router.post('/leaderboard/award', async (req, res) => {
  const users = await User.find({ role: 'tester' }).sort('-points');
  const rewards = await Reward.find({ isActive: true }).sort('positionFrom');

  for (const reward of rewards) {
    for (let pos = reward.positionFrom; pos <= reward.positionTo; pos++) {
      const user = users[pos - 1];
      if (user) {
        // Check if already claimed
        const existing = await RewardClaim.findOne({ user: user._id, reward: reward._id });
        if (!existing) {
          await RewardClaim.create({
            user: user._id,
            reward: reward._id,
            position: pos,
            points: user.points,
            prizeAmount: reward.prizeAmount,
            status: 'pending'
          });
        }
      }
    }
  }
  res.redirect('/admin/leaderboard');
});

// Update claim status
router.post('/claims/:id/status', async (req, res) => {
  const { status } = req.body;
  await RewardClaim.findByIdAndUpdate(req.params.id, {
    status,
    claimedAt: status === 'claimed' ? new Date() : null
  });
  res.redirect('/admin/leaderboard');
});

// Submissions / Feedback Review
router.get('/submissions', async (req, res) => {
  const { flow, status, user, approved } = req.query;
  const filter = {};
  if (flow) filter.flow = flow;
  if (status) filter.status = status;
  if (user) filter.user = user;
  if (approved === 'pending') filter.pointsAwarded = false;
  if (approved === 'approved') filter.pointsAwarded = true;

  const [submissions, flows, users] = await Promise.all([
    Submission.find(filter).sort('-createdAt').populate('user testCase flow'),
    Flow.find(),
    User.find({ role: 'tester' })
  ]);
  res.render('admin/submissions', { submissions, flows, users, filters: { flow, status, user, approved } });
});

// Toggle individual point component
router.post('/submissions/:id/toggle/:component', async (req, res) => {
  const { id, component } = req.params;
  const submission = await Submission.findById(id);

  if (submission && ['feedback', 'screenshot', 'bug'].includes(component)) {
    if (!submission.rejectedPoints) {
      submission.rejectedPoints = { feedback: false, screenshot: false, bug: false };
    }
    submission.rejectedPoints[component] = !submission.rejectedPoints[component];

    // Recalculate points
    let points = 1; // base
    if (submission.status === 'failed' && !submission.rejectedPoints.bug) points += 3;
    if (submission.feedback && submission.feedback.trim() && !submission.rejectedPoints.feedback) points += 1;
    if (submission.screenshot && !submission.rejectedPoints.screenshot) points += 1;
    submission.pointsEarned = points;

    await submission.save();
  }
  res.redirect('/admin/submissions');
});

// Approve submission and award points
router.post('/submissions/:id/approve', async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (submission && !submission.pointsAwarded) {
    submission.pointsAwarded = true;
    await submission.save();
    await User.findByIdAndUpdate(submission.user, { $inc: { points: submission.pointsEarned } });

    // Check if flow completion bonus should be awarded
    const FlowProgress = require('../models/FlowProgress');
    const progress = await FlowProgress.findOne({ user: submission.user, flow: submission.flow });
    if (progress && progress.isCompleted && !progress.bonusAwarded) {
      // Check if all submissions in this flow are approved
      const allSubmissions = await Submission.find({ user: submission.user, flow: submission.flow });
      const allApproved = allSubmissions.every(s => s.pointsAwarded);
      if (allApproved) {
        const flow = await Flow.findById(submission.flow);
        progress.bonusAwarded = true;
        await progress.save();
        await User.findByIdAndUpdate(submission.user, { $inc: { points: flow.completionBonus } });
      }
    }
  }
  res.redirect('/admin/submissions');
});

router.post('/submissions/:id/useful', async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('user');
  if (!submission.isUsefulFeedback) {
    submission.isUsefulFeedback = true;
    await submission.save();
    await User.findByIdAndUpdate(submission.user._id, { $inc: { points: 1 } });
  }
  res.redirect('/admin/submissions');
});

// Rerun - allow user to retake test without losing previous points
router.post('/submissions/:id/rerun', async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (submission) {
    // Remove from flow progress so user can retake
    const FlowProgress = require('../models/FlowProgress');
    await FlowProgress.updateOne(
      { user: submission.user, flow: submission.flow },
      {
        $pull: { completedTestCases: submission.testCase },
        $set: { isCompleted: false }
      }
    );
  }
  res.redirect('/admin/submissions');
});

// Reset - remove submission and deduct points
router.post('/submissions/:id/reset', async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (submission) {
    // Remove from flow progress
    const FlowProgress = require('../models/FlowProgress');
    await FlowProgress.updateOne(
      { user: submission.user, flow: submission.flow },
      {
        $pull: { completedTestCases: submission.testCase },
        $set: { isCompleted: false, bonusAwarded: false }
      }
    );
    // Deduct points if they were awarded
    if (submission.pointsAwarded) {
      await User.findByIdAndUpdate(submission.user, { $inc: { points: -submission.pointsEarned } });
    }
    // Delete submission
    await Submission.findByIdAndDelete(req.params.id);
  }
  res.redirect('/admin/submissions');
});

// Reset entire flow for a user
router.get('/users/:userId/reset-flow/:flowId', async (req, res) => {
  const { userId, flowId } = req.params;
  const FlowProgress = require('../models/FlowProgress');

  // Get all submissions for this user/flow
  const submissions = await Submission.find({ user: userId, flow: flowId });

  const totalPoints = submissions.reduce((sum, s) => sum + s.pointsEarned, 0);

  // Check if bonus was awarded
  const progress = await FlowProgress.findOne({ user: userId, flow: flowId });
  const flow = await Flow.findById(flowId);
  const bonusPoints = progress?.bonusAwarded ? flow.completionBonus : 0;

  // Deduct all points
  await User.findByIdAndUpdate(userId, { $inc: { points: -(totalPoints + bonusPoints) } });

  // Delete submissions and progress
  await Submission.deleteMany({ user: userId, flow: flowId });
  await FlowProgress.deleteOne({ user: userId, flow: flowId });

  res.redirect('/admin/users');
});

// CSV Export for submissions
router.get('/submissions/export', async (req, res) => {
  const { flow, status, user, approved } = req.query;
  const filter = {};
  if (flow) filter.flow = flow;
  if (status) filter.status = status;
  if (user) filter.user = user;
  if (approved === 'pending') filter.pointsAwarded = false;
  if (approved === 'approved') filter.pointsAwarded = true;

  const submissions = await Submission.find(filter)
    .sort('-createdAt')
    .populate('user testCase flow');

  // Build CSV
  const headers = [
    'Date', 'Time', 'Username', 'Email', 'Flow', 'Test Case',
    'Status', 'Points Earned', 'Approved', 'Feedback',
    'Has Screenshot', 'Bug Points', 'Feedback Points', 'Screenshot Points',
    'Useful Feedback', 'Admin Notes'
  ];

  const rows = submissions.map(sub => [
    sub.createdAt.toLocaleDateString(),
    sub.createdAt.toLocaleTimeString(),
    sub.user ? sub.user.username : 'N/A',
    sub.user ? sub.user.email : 'N/A',
    sub.flow ? sub.flow.name : 'N/A',
    sub.testCase ? sub.testCase.title : 'N/A',
    sub.status,
    sub.pointsEarned,
    sub.pointsAwarded ? 'Yes' : 'No',
    sub.feedback ? sub.feedback.replace(/[\n\r,]/g, ' ') : '',
    sub.screenshot ? 'Yes' : 'No',
    sub.status === 'failed' && (!sub.rejectedPoints || !sub.rejectedPoints.bug) ? '3' : '0',
    sub.feedback && (!sub.rejectedPoints || !sub.rejectedPoints.feedback) ? '1' : '0',
    sub.screenshot && (!sub.rejectedPoints || !sub.rejectedPoints.screenshot) ? '1' : '0',
    sub.isUsefulFeedback ? 'Yes' : 'No',
    sub.adminNotes ? sub.adminNotes.replace(/[\n\r,]/g, ' ') : ''
  ]);

  // Escape CSV values
  const escapeCSV = (val) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=submissions-${Date.now()}.csv`);
  res.send(csvContent);
});

// Flow Analytics Dashboard
router.get('/analytics', async (req, res) => {
  const FlowProgress = require('../models/FlowProgress');

  const [flows, allSubmissions, allProgress, users] = await Promise.all([
    Flow.find({ isActive: true }).populate('testCases'),
    Submission.find().populate('user testCase flow'),
    FlowProgress.find().populate('user flow'),
    User.find({ role: 'tester' })
  ]);

  // Build analytics data for each flow
  const flowAnalytics = flows.map(flow => {
    const flowSubmissions = allSubmissions.filter(s => s.flow && s.flow._id.equals(flow._id));
    const flowProgress = allProgress.filter(p => p.flow && p.flow._id.equals(flow._id) && p.user);

    // Users who started this flow
    const usersStarted = new Set(flowProgress.map(p => p.user._id.toString())).size;
    // Users who completed this flow
    const usersCompleted = flowProgress.filter(p => p.isCompleted).length;
    // Users with all approved
    const usersFullyApproved = flowProgress.filter(p => {
      if (!p.isCompleted || !p.user) return false;
      const userSubs = flowSubmissions.filter(s => s.user && s.user._id.equals(p.user._id));
      return userSubs.length > 0 && userSubs.every(s => s.pointsAwarded);
    }).length;

    // Test case statistics
    const testCaseStats = flow.testCases.map(tc => {
      const tcSubs = flowSubmissions.filter(s => s.testCase && s.testCase._id.equals(tc._id));
      const passed = tcSubs.filter(s => s.status === 'passed').length;
      const failed = tcSubs.filter(s => s.status === 'failed').length;
      const approved = tcSubs.filter(s => s.pointsAwarded).length;
      const pending = tcSubs.filter(s => !s.pointsAwarded).length;

      return {
        id: tc._id,
        title: tc.title,
        total: tcSubs.length,
        passed,
        failed,
        approved,
        pending,
        passRate: tcSubs.length > 0 ? Math.round((passed / tcSubs.length) * 100) : 0
      };
    });

    return {
      id: flow._id,
      name: flow.name,
      description: flow.description,
      totalTestCases: flow.testCases.length,
      completionBonus: flow.completionBonus,
      usersStarted,
      usersCompleted,
      usersFullyApproved,
      completionRate: usersStarted > 0 ? Math.round((usersCompleted / usersStarted) * 100) : 0,
      totalSubmissions: flowSubmissions.length,
      passedSubmissions: flowSubmissions.filter(s => s.status === 'passed').length,
      failedSubmissions: flowSubmissions.filter(s => s.status === 'failed').length,
      approvedSubmissions: flowSubmissions.filter(s => s.pointsAwarded).length,
      pendingSubmissions: flowSubmissions.filter(s => !s.pointsAwarded).length,
      testCaseStats
    };
  });

  // Overall stats
  const overallStats = {
    totalFlows: flows.length,
    totalTestCases: flows.reduce((sum, f) => sum + f.testCases.length, 0),
    totalSubmissions: allSubmissions.length,
    totalUsers: users.length,
    approvedSubmissions: allSubmissions.filter(s => s.pointsAwarded).length,
    pendingSubmissions: allSubmissions.filter(s => !s.pointsAwarded).length,
    passRate: allSubmissions.length > 0
      ? Math.round((allSubmissions.filter(s => s.status === 'passed').length / allSubmissions.length) * 100)
      : 0
  };

  res.render('admin/analytics', { flowAnalytics, overallStats });
});

// Backup Management
router.get('/backups', async (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.gz'))
      .map(filename => {
        const filePath = path.join(BACKUPS_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.render('admin/backups', {
      backups: files,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    res.render('admin/backups', { backups: [], error: 'Failed to list backups', success: null });
  }
});

router.post('/backups', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `testquiz-backup-${timestamp}.gz`;
    const filePath = path.join(BACKUPS_DIR, filename);

    // Try docker exec first, fall back to direct mongodump
    try {
      // For Docker setup
      execSync(`docker exec mongodb mongodump --db testquiz --archive --gzip > "${filePath}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
    } catch (dockerErr) {
      // Fall back to direct mongodump (if MongoDB is on localhost)
      execSync(`mongodump --uri="${process.env.MONGODB_URI}" --archive="${filePath}" --gzip`, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }

    // Verify file was created and has content
    const stats = fs.statSync(filePath);
    if (stats.size < 100) {
      fs.unlinkSync(filePath);
      throw new Error('Backup file is too small, may be corrupted');
    }

    // Keep only last 10 backups
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.gz'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      files.slice(10).forEach(f => fs.unlinkSync(path.join(BACKUPS_DIR, f.name)));
    }

    res.redirect('/admin/backups?success=Backup created successfully');
  } catch (err) {
    console.error('Backup error:', err);
    res.redirect('/admin/backups?error=' + encodeURIComponent('Backup failed: ' + err.message));
  }
});

router.get('/backups/:filename/download', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).send('Invalid filename');
    }

    const filePath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Backup not found');
    }

    res.download(filePath, filename);
  } catch (err) {
    res.status(500).send('Download failed');
  }
});

router.post('/backups/:filename/delete', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).send('Invalid filename');
    }

    const filePath = path.join(BACKUPS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.redirect('/admin/backups?success=Backup deleted');
  } catch (err) {
    res.redirect('/admin/backups?error=' + encodeURIComponent('Delete failed: ' + err.message));
  }
});

module.exports = router;
