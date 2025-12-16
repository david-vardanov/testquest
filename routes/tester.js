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
    Flow.find({ isActive: true }).populate('testCases').populate('prerequisiteFlows').sort('order'),
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

  // Check prerequisite flows for each flow
  const flowsWithLockStatus = flows.map(flow => {
    const flowObj = flow.toObject();
    flowObj.isLocked = false;
    flowObj.missingPrereqs = [];

    if (flow.prerequisiteFlows && flow.prerequisiteFlows.length > 0) {
      for (const prereq of flow.prerequisiteFlows) {
        const prereqProgress = progresses.find(p =>
          p.flow.toString() === prereq._id.toString() && p.isCompleted
        );
        if (!prereqProgress) {
          flowObj.isLocked = true;
          flowObj.missingPrereqs.push(prereq);
        }
      }
    }
    return flowObj;
  });

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

  res.render('tester/dashboard', { flows: flowsWithLockStatus, user, progressMap, rank, currentReward, nextReward, pointsToNext, myClaims, leaderboard, rewards, seasonSettings, showTutorial });
});

// Start/Continue a flow
router.get('/flow/:id', async (req, res) => {
  const flow = await Flow.findById(req.params.id).populate('testCases').populate('prerequisiteFlows');
  if (!flow) return res.redirect('/tester');

  // Check if user has completed all prerequisite flows
  if (flow.prerequisiteFlows && flow.prerequisiteFlows.length > 0) {
    for (const prereq of flow.prerequisiteFlows) {
      const prereqProgress = await FlowProgress.findOne({
        user: req.session.user.id,
        flow: prereq._id,
        isCompleted: true
      });
      if (!prereqProgress) {
        // User hasn't completed prerequisite - redirect to dashboard
        return res.redirect('/tester');
      }
    }
  }

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
    res.status(500).json({ error: 'Error al completar el tutorial' });
  }
});

// Practice Flow - hardcoded flow for learning
const practiceTestCases = [
  {
    id: 1,
    title: 'Verificar la Pagina de Inicio de Sesion',
    description: 'Esta prueba de practica te ensena como completar un caso de prueba basico siguiendo la lista de verificacion.',
    scenario: 'Mira la lista de verificacion abajo - estos son los pasos que debes verificar\nHaz clic en cada casilla mientras completas ese paso\nUna vez que todas las casillas esten marcadas, puedes seleccionar "Aprobado"',
    expectedResult: 'Deberias ver todas las casillas en verde\nLa opcion "Aprobado" se habilita\nEntiendes como funciona el sistema de lista de verificacion'
  },
  {
    id: 2,
    title: 'Practica Reportando un Error',
    description: 'A veces encontraras errores! Esto te ensena como reportarlos para obtener puntos extra.',
    scenario: 'Imagina que encontraste un problema con la aplicacion\nSelecciona "Fallido" en la seccion de resultado de prueba abajo\nEscribe una descripcion del error en el cuadro de comentarios',
    expectedResult: 'Seleccionaste Fallido lo cual otorga +3 puntos extra\nEscribiste comentarios describiendo el problema\nEntiendes como reportar errores te da puntos extra'
  },
  {
    id: 3,
    title: 'Enviar con Evidencia',
    description: 'Las capturas de pantalla proporcionan prueba visual. Aprende como adjuntarlas para obtener puntos extra!',
    scenario: 'Toma una captura de pantalla de esta pagina (o cualquier imagen)\nHaz clic en "Elegir Archivo" y sube tu captura de pantalla\nAgrega texto de comentarios explicando que muestra la captura',
    expectedResult: 'Captura de pantalla subida exitosamente (+1 punto)\nComentarios proporcionados (+1 punto)\nEntiendes como maximizar puntos en cada envio'
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
