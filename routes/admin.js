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
const SeasonArchive = require('../models/SeasonArchive');
const TesterGroup = require('../models/TesterGroup');
const Message = require('../models/Message');

// Multer config for message screenshots
const messageStorage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `msg-${Date.now()}-${file.originalname}`);
  }
});
const messageUpload = multer({ storage: messageStorage });

// Ensure backups directory exists
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

router.use(isAdmin);

// Leaderboard/Rankings
router.get('/rankings', function(req, res) {
  Promise.all([
    User.find({ role: 'tester' }).sort('-points'),
    Reward.find({ isActive: true }).sort('positionFrom'),
    LeaderboardSettings.findOne({ isActive: true }),
    SeasonArchive.find().sort('-closedAt')
  ]).then(function(results) {
    res.render('admin/rankings', {
      users: results[0] || [],
      rewards: results[1] || [],
      seasonSettings: results[2] || null,
      archives: results[3] || [],
      error: req.query.error || null,
      success: req.query.success || null
    });
  });
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
  const users = await User.find({ role: 'tester' }).populate('testerGroup').sort('-createdAt');
  res.render('admin/users', { users });
});

router.get('/users/new', async (req, res) => {
  const groups = await TesterGroup.find().sort('code');
  res.render('admin/users-form', { user: null, groups });
});

router.post('/users', async (req, res) => {
  const { username, email, password, isActive, testerGroup } = req.body;
  await User.create({
    username,
    email,
    password,
    role: 'tester',
    isActive: isActive === 'on',
    testerGroup: testerGroup || null
  });
  res.redirect('/admin/users');
});

router.get('/users/:id/edit', async (req, res) => {
  const [user, groups] = await Promise.all([
    User.findById(req.params.id),
    TesterGroup.find().sort('code')
  ]);
  res.render('admin/users-form', { user, groups });
});

router.post('/users/:id', async (req, res) => {
  const { username, email, password, isActive, testerGroup } = req.body;
  const update = {
    username,
    email,
    isActive: isActive === 'on',
    testerGroup: testerGroup || null
  };
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

// Tester Groups CRUD
router.get('/groups', async (req, res) => {
  const groups = await TesterGroup.find().sort('code');
  // Count users per group
  const groupCounts = await User.aggregate([
    { $match: { role: 'tester', testerGroup: { $ne: null } } },
    { $group: { _id: '$testerGroup', count: { $sum: 1 } } }
  ]);
  const countMap = {};
  groupCounts.forEach(g => { countMap[g._id.toString()] = g.count; });
  res.render('admin/groups', {
    groups,
    countMap,
    success: req.query.success || null,
    error: req.query.error || null
  });
});

router.get('/groups/new', (req, res) => {
  res.render('admin/groups-form', { group: null });
});

router.post('/groups', async (req, res) => {
  const { name, code, description, color } = req.body;
  try {
    await TesterGroup.create({ name, code: code.toUpperCase(), description, color });
    res.redirect('/admin/groups?success=' + encodeURIComponent('Grupo creado exitosamente'));
  } catch (err) {
    if (err.code === 11000) {
      res.redirect('/admin/groups?error=' + encodeURIComponent('El codigo de grupo ya existe'));
    } else {
      res.redirect('/admin/groups?error=' + encodeURIComponent(err.message));
    }
  }
});

router.get('/groups/:id/edit', async (req, res) => {
  const group = await TesterGroup.findById(req.params.id);
  res.render('admin/groups-form', { group });
});

router.post('/groups/:id', async (req, res) => {
  const { name, code, description, color } = req.body;
  try {
    await TesterGroup.findByIdAndUpdate(req.params.id, {
      name,
      code: code.toUpperCase(),
      description,
      color
    });
    res.redirect('/admin/groups?success=' + encodeURIComponent('Grupo actualizado'));
  } catch (err) {
    res.redirect('/admin/groups?error=' + encodeURIComponent(err.message));
  }
});

router.post('/groups/:id/delete', async (req, res) => {
  // Check if any users are in this group
  const usersInGroup = await User.countDocuments({ testerGroup: req.params.id });
  if (usersInGroup > 0) {
    return res.redirect('/admin/groups?error=' + encodeURIComponent('No se puede eliminar: hay ' + usersInGroup + ' usuarios en este grupo'));
  }
  await TesterGroup.findByIdAndDelete(req.params.id);
  res.redirect('/admin/groups?success=' + encodeURIComponent('Grupo eliminado'));
});

// Test Cases CRUD
router.get('/testcases', async (req, res) => {
  const testCases = await TestCase.find().sort('-createdAt');
  res.render('admin/testcases', { testCases });
});

router.get('/testcases/new', async (req, res) => {
  const [groups, groupCounts] = await Promise.all([
    TesterGroup.find().sort('code'),
    User.aggregate([
      { $match: { role: 'tester', testerGroup: { $ne: null } } },
      { $group: { _id: '$testerGroup', count: { $sum: 1 } } }
    ])
  ]);
  const countMap = {};
  groupCounts.forEach(g => { countMap[g._id.toString()] = g.count; });
  res.render('admin/testcases-form', { testCase: null, groups, groupCountMap: countMap });
});

router.post('/testcases', async (req, res) => {
  const { title, description, scenario, expectedResult, points, isActive } = req.body;
  // Handle visibleToGroups as array
  let visibleToGroups = req.body.visibleToGroups || [];
  if (!Array.isArray(visibleToGroups)) visibleToGroups = [visibleToGroups];
  visibleToGroups = visibleToGroups.filter(g => g); // Remove empty values

  // Handle reassign on fail (unlock specific test case)
  const reassignOnFail = {
    enabled: req.body['reassignOnFail.enabled'] === 'on',
    targetTestCase: req.body['reassignOnFail.targetTestCase'] || null
  };

  await TestCase.create({
    title, description, scenario, expectedResult, points,
    isActive: isActive === 'on',
    visibleToGroups,
    reassignOnFail
  });
  res.redirect('/admin/testcases');
});

router.get('/testcases/:id/edit', async (req, res) => {
  const [testCase, groups, groupCounts, allTestCases] = await Promise.all([
    TestCase.findById(req.params.id).populate('visibleToGroups').populate('reassignOnFail.targetTestCase'),
    TesterGroup.find().sort('code'),
    User.aggregate([
      { $match: { role: 'tester', testerGroup: { $ne: null } } },
      { $group: { _id: '$testerGroup', count: { $sum: 1 } } }
    ]),
    TestCase.find({ _id: { $ne: req.params.id } }).select('title').sort('title')
  ]);
  const countMap = {};
  groupCounts.forEach(g => { countMap[g._id.toString()] = g.count; });
  res.render('admin/testcases-form', { testCase, groups, groupCountMap: countMap, allTestCases });
});

router.post('/testcases/:id', async (req, res) => {
  const { title, description, scenario, expectedResult, points, isActive } = req.body;
  // Handle visibleToGroups as array
  let visibleToGroups = req.body.visibleToGroups || [];
  if (!Array.isArray(visibleToGroups)) visibleToGroups = [visibleToGroups];
  visibleToGroups = visibleToGroups.filter(g => g);

  // Handle reassign on fail (unlock specific test case)
  const reassignOnFail = {
    enabled: req.body['reassignOnFail.enabled'] === 'on',
    targetTestCase: req.body['reassignOnFail.targetTestCase'] || null
  };

  await TestCase.findByIdAndUpdate(req.params.id, {
    title, description, scenario, expectedResult, points,
    isActive: isActive === 'on',
    visibleToGroups,
    reassignOnFail
  });
  res.redirect('/admin/testcases');
});

router.post('/testcases/:id/delete', async (req, res) => {
  await TestCase.findByIdAndDelete(req.params.id);
  res.redirect('/admin/testcases');
});

// Flows CRUD
router.get('/flows', async (req, res) => {
  const flows = await Flow.find().populate('testCases').sort('order');
  res.render('admin/flows', {
    flows,
    success: req.query.success || null,
    error: req.query.error || null
  });
});

router.get('/flows/new', async (req, res) => {
  const [allTestCases, allFlows, groups, groupCounts] = await Promise.all([
    TestCase.find({ isActive: true }).sort('-createdAt'),
    Flow.find({ isActive: true }).sort('name'),
    TesterGroup.find().sort('code'),
    User.aggregate([
      { $match: { role: 'tester', testerGroup: { $ne: null } } },
      { $group: { _id: '$testerGroup', count: { $sum: 1 } } }
    ])
  ]);
  const countMap = {};
  groupCounts.forEach(g => { countMap[g._id.toString()] = g.count; });
  res.render('admin/flows-form', { flow: null, allTestCases, allFlows, groups, groupCountMap: countMap });
});

router.post('/flows', async (req, res) => {
  const { name, description, testCases, points, completionBonus, isActive, prerequisiteFlows, order } = req.body;

  // Create or reuse test cases
  const testCaseIds = [];
  if (testCases && Array.isArray(testCases)) {
    for (const tc of testCases) {
      // Parse visibleToGroups
      let visibleToGroups = tc.visibleToGroups || [];
      if (!Array.isArray(visibleToGroups)) visibleToGroups = [visibleToGroups];
      visibleToGroups = visibleToGroups.filter(g => g);

      // Parse reassignOnFail (unlock specific test case)
      let reassignOnFail = { enabled: false, targetTestCase: null };
      if (tc.reassignOnFail) {
        const rof = tc.reassignOnFail;
        reassignOnFail.enabled = rof.enabled === 'on' || rof.enabled === true;
        reassignOnFail.targetTestCase = rof.targetTestCase || null;
      }

      // Parse isHidden
      const isHidden = tc.isHidden === 'on' || tc.isHidden === true;

      if (tc.isReused === 'true' && tc.reusedId) {
        // Reuse existing test case - update visibleToGroups, reassignOnFail, and isHidden
        await TestCase.findByIdAndUpdate(tc.reusedId, { visibleToGroups, reassignOnFail, isHidden });
        testCaseIds.push(tc.reusedId);
      } else if (tc.title && tc.scenario) {
        // Create new test case
        const created = await TestCase.create({
          title: tc.title,
          description: tc.description,
          scenario: tc.scenario,
          expectedResult: tc.expectedResult,
          points: tc.points || 1,
          isActive: true,
          isHidden,
          visibleToGroups,
          reassignOnFail
        });
        testCaseIds.push(created._id);
      }
    }
  }

  // Handle prerequisite flows (can be string, array, or undefined)
  let prereqIds = [];
  if (prerequisiteFlows) {
    prereqIds = Array.isArray(prerequisiteFlows) ? prerequisiteFlows : [prerequisiteFlows];
  }

  await Flow.create({
    name, description,
    testCases: testCaseIds,
    prerequisiteFlows: prereqIds,
    order: order || 0,
    points: points || 0,
    completionBonus,
    isActive: isActive === 'on'
  });
  res.redirect('/admin/flows');
});

// Export flows and test cases as JSON (must be before :id routes)
router.get('/flows/export', async (req, res) => {
  try {
    const [flows, groups] = await Promise.all([
      Flow.find().populate({
        path: 'testCases',
        populate: [
          { path: 'visibleToGroups' },
          { path: 'reassignOnFail.targetTestCase' }
        ]
      }).sort('order'),
      TesterGroup.find().sort('code')
    ]);

    const exportData = {
      version: '1.3',
      exportDate: new Date().toISOString(),
      groups: groups.map(g => ({
        _id: g._id.toString(),
        name: g.name,
        code: g.code,
        description: g.description || '',
        color: g.color || '#6c757d'
      })),
      flows: flows.map(flow => ({
        _id: flow._id.toString(),
        name: flow.name,
        description: flow.description || '',
        order: flow.order || 0,
        points: flow.points || 0,
        completionBonus: flow.completionBonus || 3,
        isActive: flow.isActive,
        prerequisiteFlowIds: (flow.prerequisiteFlows || []).map(id => id.toString()),
        testCases: (flow.testCases || []).map(tc => ({
          _id: tc._id.toString(),
          title: tc.title,
          description: tc.description,
          scenario: tc.scenario,
          expectedResult: tc.expectedResult,
          points: tc.points || 1,
          isActive: tc.isActive,
          isHidden: tc.isHidden || false,
          visibleToGroupCodes: (tc.visibleToGroups || []).map(g => g.code || g.toString()),
          reassignOnFail: tc.reassignOnFail && tc.reassignOnFail.enabled ? {
            enabled: true,
            targetTestCaseId: tc.reassignOnFail.targetTestCase ? tc.reassignOnFail.targetTestCase._id.toString() : null
          } : null
        }))
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=flows-export.json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).send('Error exporting flows');
  }
});

// Import flows and test cases from JSON
const jsonUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JSON'));
    }
  }
});

router.post('/flows/import', jsonUpload.single('jsonFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/admin/flows?error=' + encodeURIComponent('No se subio ningun archivo'));
    }

    const fileContent = req.file.buffer.toString('utf8');
    const importData = JSON.parse(fileContent);

    // Validate structure
    if (!importData.flows || !Array.isArray(importData.flows)) {
      throw new Error('Estructura JSON invalida: falta el array "flows"');
    }

    let updatedFlows = 0;
    let createdFlows = 0;
    let updatedTestCases = 0;
    let createdTestCases = 0;
    let updatedGroups = 0;
    let createdGroups = 0;

    // First: Import/update groups if present (v1.1+)
    const groupCodeToId = {};
    if (importData.groups && Array.isArray(importData.groups)) {
      for (const groupData of importData.groups) {
        let group = await TesterGroup.findOne({ code: groupData.code });
        if (group) {
          // Update existing group
          group.name = groupData.name;
          group.description = groupData.description;
          group.color = groupData.color;
          await group.save();
          updatedGroups++;
        } else {
          // Create new group
          group = await TesterGroup.create({
            name: groupData.name,
            code: groupData.code,
            description: groupData.description,
            color: groupData.color
          });
          createdGroups++;
        }
        groupCodeToId[groupData.code] = group._id;
      }
    }

    // Also load existing groups for reference
    const existingGroups = await TesterGroup.find();
    existingGroups.forEach(g => {
      if (!groupCodeToId[g.code]) {
        groupCodeToId[g.code] = g._id;
      }
    });

    // Map old IDs to new IDs for prerequisite handling
    const flowIdMap = {};

    for (const flowData of importData.flows) {
      let flow;

      // Try to find existing flow by ID
      if (flowData._id) {
        try {
          flow = await Flow.findById(flowData._id);
        } catch (e) {
          // Invalid ID format, will create new
        }
      }

      if (flow) {
        // UPDATE existing flow
        flow.name = flowData.name;
        flow.description = flowData.description;
        flow.order = flowData.order;
        flow.points = flowData.points;
        flow.completionBonus = flowData.completionBonus;
        flow.isActive = flowData.isActive;
        updatedFlows++;
      } else {
        // CREATE new flow
        flow = new Flow({
          name: flowData.name,
          description: flowData.description,
          order: flowData.order,
          points: flowData.points,
          completionBonus: flowData.completionBonus,
          isActive: flowData.isActive,
          testCases: []
        });
        createdFlows++;
      }

      // Handle test cases
      const testCaseIds = [];
      for (const tcData of flowData.testCases || []) {
        let testCase;

        if (tcData._id) {
          try {
            testCase = await TestCase.findById(tcData._id);
          } catch (e) {
            // Invalid ID format, will create new
          }
        }

        // Map group codes to IDs for visibleToGroups
        const visibleToGroups = (tcData.visibleToGroupCodes || [])
          .map(code => groupCodeToId[code])
          .filter(id => id);

        // reassignOnFail will be handled in second pass after all test cases created
        let reassignOnFail = { enabled: false, targetTestCase: null };
        if (tcData.reassignOnFail && tcData.reassignOnFail.enabled) {
          reassignOnFail.enabled = true;
          // Store original target ID for second pass mapping
          reassignOnFail._pendingTargetId = tcData.reassignOnFail.targetTestCaseId || null;
        }

        if (testCase) {
          // UPDATE existing test case
          testCase.title = tcData.title;
          testCase.description = tcData.description;
          testCase.scenario = tcData.scenario;
          testCase.expectedResult = tcData.expectedResult;
          testCase.points = tcData.points;
          testCase.isActive = tcData.isActive;
          testCase.isHidden = tcData.isHidden || false;
          testCase.visibleToGroups = visibleToGroups;
          testCase.reassignOnFail = reassignOnFail;
          await testCase.save();
          updatedTestCases++;
        } else {
          // CREATE new test case
          testCase = await TestCase.create({
            title: tcData.title,
            description: tcData.description,
            scenario: tcData.scenario,
            expectedResult: tcData.expectedResult,
            points: tcData.points || 1,
            isActive: tcData.isActive !== false,
            isHidden: tcData.isHidden || false,
            visibleToGroups,
            reassignOnFail
          });
          createdTestCases++;
        }

        // Map old ID to new ID for reassignOnFail second pass
        if (tcData._id) {
          flowIdMap['tc_' + tcData._id] = testCase._id;
        }
        testCaseIds.push(testCase._id);
      }

      flow.testCases = testCaseIds;
      await flow.save();

      // Store ID mapping for prerequisites
      if (flowData._id) {
        flowIdMap[flowData._id] = flow._id;
      }
    }

    // Second pass: update prerequisite references
    for (const flowData of importData.flows) {
      if (flowData.prerequisiteFlowIds && flowData.prerequisiteFlowIds.length > 0) {
        const flowId = flowIdMap[flowData._id] || flowData._id;
        let flow;
        try {
          flow = await Flow.findById(flowId);
        } catch (e) {
          continue;
        }
        if (flow) {
          flow.prerequisiteFlows = flowData.prerequisiteFlowIds
            .map(oldId => flowIdMap[oldId] || oldId)
            .filter(id => id);
          await flow.save();
        }
      }
    }

    // Third pass: resolve reassignOnFail.targetTestCase references
    for (const flowData of importData.flows) {
      for (const tcData of flowData.testCases || []) {
        if (tcData.reassignOnFail && tcData.reassignOnFail.enabled && tcData.reassignOnFail.targetTestCaseId) {
          const testCaseId = flowIdMap['tc_' + tcData._id] || tcData._id;
          const targetTestCaseId = flowIdMap['tc_' + tcData.reassignOnFail.targetTestCaseId] || tcData.reassignOnFail.targetTestCaseId;

          if (testCaseId && targetTestCaseId) {
            try {
              await TestCase.findByIdAndUpdate(testCaseId, {
                'reassignOnFail.targetTestCase': targetTestCaseId,
                $unset: { 'reassignOnFail._pendingTargetId': 1 }
              });
            } catch (e) {
              // Silently continue if mapping fails
            }
          }
        }
      }
    }

    let message = `Importacion completada: ${updatedFlows} flujos actualizados, ${createdFlows} creados. ${updatedTestCases} casos actualizados, ${createdTestCases} creados.`;
    if (updatedGroups > 0 || createdGroups > 0) {
      message += ` ${updatedGroups} grupos actualizados, ${createdGroups} creados.`;
    }
    res.redirect('/admin/flows?success=' + encodeURIComponent(message));
  } catch (err) {
    console.error('Import error:', err);
    res.redirect('/admin/flows?error=' + encodeURIComponent('Error en importacion: ' + err.message));
  }
});

router.get('/flows/:id/edit', async (req, res) => {
  const [flow, allTestCases, allFlows, groups, groupCounts] = await Promise.all([
    Flow.findById(req.params.id).populate({
      path: 'testCases',
      populate: [
        { path: 'visibleToGroups' },
        { path: 'reassignOnFail.targetTestCase' }
      ]
    }).populate('prerequisiteFlows'),
    TestCase.find({ isActive: true }).sort('-createdAt'),
    Flow.find({ isActive: true, _id: { $ne: req.params.id } }).sort('name'), // Exclude self
    TesterGroup.find().sort('code'),
    User.aggregate([
      { $match: { role: 'tester', testerGroup: { $ne: null } } },
      { $group: { _id: '$testerGroup', count: { $sum: 1 } } }
    ])
  ]);
  const countMap = {};
  groupCounts.forEach(g => { countMap[g._id.toString()] = g.count; });
  res.render('admin/flows-form', { flow, allTestCases, allFlows, groups, groupCountMap: countMap });
});

router.post('/flows/:id', async (req, res) => {
  const { name, description, testCases, points, completionBonus, isActive, prerequisiteFlows, order } = req.body;

  const flow = await Flow.findById(req.params.id);
  const newTestCaseIds = [];
  const keptIds = [];

  if (testCases && Array.isArray(testCases)) {
    for (const tc of testCases) {
      // Parse visibleToGroups for this test case
      let visibleToGroups = tc.visibleToGroups || [];
      if (!Array.isArray(visibleToGroups)) visibleToGroups = [visibleToGroups];
      visibleToGroups = visibleToGroups.filter(g => g);

      // Parse reassignOnFail for this test case (unlock specific test case)
      let reassignOnFail = { enabled: false, targetTestCase: null };
      if (tc.reassignOnFail) {
        const rof = tc.reassignOnFail;
        reassignOnFail.enabled = rof.enabled === 'on' || rof.enabled === true;
        reassignOnFail.targetTestCase = rof.targetTestCase || null;
      }

      // Parse isHidden
      const isHidden = tc.isHidden === 'on' || tc.isHidden === true;

      if (tc.isReused === 'true' && tc.reusedId) {
        // Reuse existing test case - update visibleToGroups, reassignOnFail, and isHidden
        await TestCase.findByIdAndUpdate(tc.reusedId, { visibleToGroups, reassignOnFail, isHidden });
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
            points: tc.points || 1,
            isHidden,
            visibleToGroups,
            reassignOnFail
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
            isActive: true,
            isHidden,
            visibleToGroups,
            reassignOnFail
          });
          newTestCaseIds.push(created._id);
        }
      }
    }
  }

  // Handle prerequisite flows (can be string, array, or undefined)
  let prereqIds = [];
  if (prerequisiteFlows) {
    prereqIds = Array.isArray(prerequisiteFlows) ? prerequisiteFlows : [prerequisiteFlows];
  }

  await Flow.findByIdAndUpdate(req.params.id, {
    name, description,
    testCases: newTestCaseIds,
    prerequisiteFlows: prereqIds,
    order: order || 0,
    points: points || 0,
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
  const { name, endDate } = req.body;
  let settings = await LeaderboardSettings.findOne({ isActive: true });
  if (settings) {
    settings.name = name;
    settings.endDate = endDate || null;
    await settings.save();
  } else {
    await LeaderboardSettings.create({ name, endDate, startDate: new Date() });
  }
  res.redirect('/admin/rankings?success=Configuracion guardada');
});

// Close season - archive leaderboard and reset points
router.post('/leaderboard/close', async (req, res) => {
  try {
    const settings = await LeaderboardSettings.findOne({ isActive: true });
    const users = await User.find({ role: 'tester' }).sort('-points');
    const rewards = await Reward.find({ isActive: true }).sort('positionFrom');

    if (users.length === 0) {
      return res.redirect('/admin/rankings?error=No hay usuarios para archivar');
    }

    // Build leaderboard snapshot with rewards
    const leaderboard = users.map((user, index) => {
      const position = index + 1;
      const userReward = rewards.find(r => position >= r.positionFrom && position <= r.positionTo);
      return {
        user: user._id,
        username: user.username,
        position,
        points: user.points,
        reward: userReward ? {
          name: userReward.name,
          prizeDescription: userReward.prizeDescription,
          prizeAmount: userReward.prizeAmount
        } : null
      };
    });

    // Create archive
    await SeasonArchive.create({
      name: settings ? settings.name : 'Season',
      startDate: settings ? settings.startDate : null,
      endDate: settings ? settings.endDate : new Date(),
      closedAt: new Date(),
      leaderboard
    });

    // Reset all tester points to 0
    await User.updateMany({ role: 'tester' }, { $set: { points: 0 } });

    // Reset or create new season settings
    if (settings) {
      settings.name = 'Nueva Temporada';
      settings.startDate = new Date();
      settings.endDate = null;
      await settings.save();
    } else {
      await LeaderboardSettings.create({ name: 'Nueva Temporada', startDate: new Date() });
    }

    res.redirect('/admin/rankings?success=Temporada cerrada y archivada. Todos los puntos han sido reiniciados.');
  } catch (err) {
    console.error('Close season error:', err);
    res.redirect('/admin/rankings?error=' + encodeURIComponent('Error al cerrar temporada: ' + err.message));
  }
});

// View archived season
router.get('/leaderboard/archive/:id', async (req, res) => {
  const archive = await SeasonArchive.findById(req.params.id);
  if (!archive) {
    return res.redirect('/admin/rankings?error=Archivo no encontrado');
  }
  res.render('admin/leaderboard-archive', { archive });
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
  res.redirect('/admin/rankings');
});

// Update claim status
router.post('/claims/:id/status', async (req, res) => {
  const { status } = req.body;
  await RewardClaim.findByIdAndUpdate(req.params.id, {
    status,
    claimedAt: status === 'claimed' ? new Date() : null
  });
  res.redirect('/admin/rankings');
});

// Submissions / Feedback Review
router.get('/submissions', async (req, res) => {
  const { flow, status, user, approved, group } = req.query;
  const filter = {};
  if (flow) filter.flow = flow;
  if (status) filter.status = status;
  if (user) filter.user = user;
  if (group) filter.userGroupAtSubmission = group;
  if (approved === 'pending') filter.pointsAwarded = false;
  if (approved === 'approved') filter.pointsAwarded = true;

  const [submissions, flows, users, groups] = await Promise.all([
    Submission.find(filter).sort('-createdAt').populate('user testCase flow userGroupAtSubmission reassignedFrom'),
    Flow.find(),
    User.find({ role: 'tester' }),
    TesterGroup.find().sort('code')
  ]);

  res.render('admin/submissions', {
    submissions,
    flows,
    users,
    groups,
    filters: { flow, status, user, approved, group }
  });
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
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect('/admin/submissions' + (queryStr ? '?' + queryStr : ''));
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
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect('/admin/submissions' + (queryStr ? '?' + queryStr : ''));
});

router.post('/submissions/:id/useful', async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('user');
  if (!submission.isUsefulFeedback) {
    submission.isUsefulFeedback = true;
    await submission.save();
    await User.findByIdAndUpdate(submission.user._id, { $inc: { points: 1 } });
  }
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect('/admin/submissions' + (queryStr ? '?' + queryStr : ''));
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
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect('/admin/submissions' + (queryStr ? '?' + queryStr : ''));
});

// Reset - remove submission and deduct points
router.post('/submissions/:id/reset', async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (submission) {
    // Remove from flow progress
    const FlowProgress = require('../models/FlowProgress');

    // Check if flow completion bonus was awarded
    const progress = await FlowProgress.findOne({ user: submission.user, flow: submission.flow });
    let bonusToDeduct = 0;
    if (progress && progress.bonusAwarded) {
      const flow = await Flow.findById(submission.flow);
      if (flow) {
        bonusToDeduct = flow.completionBonus || 0;
      }
    }

    await FlowProgress.updateOne(
      { user: submission.user, flow: submission.flow },
      {
        $pull: { completedTestCases: submission.testCase },
        $set: { isCompleted: false, bonusAwarded: false }
      }
    );

    // Deduct points if they were awarded (submission points + useful feedback + flow bonus)
    if (submission.pointsAwarded) {
      let totalDeduct = submission.pointsEarned;
      if (submission.isUsefulFeedback) {
        totalDeduct += 1;
      }
      totalDeduct += bonusToDeduct;
      await User.findByIdAndUpdate(submission.user, { $inc: { points: -totalDeduct } });
    }
    // Delete submission
    await Submission.findByIdAndDelete(req.params.id);
  }
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect('/admin/submissions' + (queryStr ? '?' + queryStr : ''));
});

// Toggle hidden status for a submission
router.post('/submissions/:id/toggle-hidden', async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Envio no encontrado' });
    }
    submission.hiddenByAdmin = !submission.hiddenByAdmin;
    await submission.save();
    res.json({ success: true, hidden: submission.hiddenByAdmin });
  } catch (err) {
    console.error('Toggle hidden error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/submissions/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      id,
      { feedback: feedback || '' },
      { new: true }
    );
    if (!submission) {
      return res.status(404).json({ error: 'Envio no encontrado' });
    }
    res.json({ success: true, feedback: submission.feedback });
  } catch (err) {
    console.error('Update feedback error:', err);
    res.status(500).json({ error: err.message });
  }
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
  const { flow, status, user, approved, group } = req.query;
  const filter = {};
  if (flow) filter.flow = flow;
  if (status) filter.status = status;
  if (user) filter.user = user;
  if (group) filter.userGroupAtSubmission = group;
  if (approved === 'pending') filter.pointsAwarded = false;
  if (approved === 'approved') filter.pointsAwarded = true;

  const submissions = await Submission.find(filter)
    .sort('-createdAt')
    .populate('user testCase flow userGroupAtSubmission reassignedFrom');

  // Build CSV
  const headers = [
    'Date', 'Time', 'Username', 'Email', 'Group', 'Flow', 'Test Case',
    'Status', 'Points Earned', 'Approved', 'Feedback',
    'Has Screenshot', 'Bug Points', 'Feedback Points', 'Screenshot Points',
    'Useful Feedback', 'Was Reassigned', 'Reassigned From', 'Reassignment Reason'
  ];

  const rows = submissions.map(sub => [
    sub.createdAt.toLocaleDateString(),
    sub.createdAt.toLocaleTimeString(),
    sub.user ? sub.user.username : 'N/A',
    sub.user ? sub.user.email : 'N/A',
    sub.userGroupAtSubmission ? sub.userGroupAtSubmission.code : '',
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
    sub.wasReassigned ? 'Yes' : 'No',
    sub.reassignedFrom ? sub.reassignedFrom.code : '',
    sub.reassignmentReason ? sub.reassignmentReason.replace(/[\n\r,]/g, ' ') : ''
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
    res.render('admin/backups', { backups: [], error: 'Error al listar respaldos', success: null });
  }
});

router.post('/backups', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `testquiz-backup-${timestamp}.gz`;
    const filePath = path.join(BACKUPS_DIR, filename);

    // Try docker exec first, fall back to direct mongodump
    try {
      // For Docker Compose setup - try common container names
      const containerNames = ['testquest-mongo-1', 'testquest_mongo_1', 'mongo', 'mongodb'];
      let success = false;

      for (const containerName of containerNames) {
        try {
          execSync(`docker exec ${containerName} mongodump --db testquiz --archive --gzip > "${filePath}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
          });
          success = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!success) {
        throw new Error('No docker container found');
      }
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
      throw new Error('El archivo de respaldo es muy pequeno, puede estar corrupto');
    }

    // Keep only last 10 backups
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.gz'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      files.slice(10).forEach(f => fs.unlinkSync(path.join(BACKUPS_DIR, f.name)));
    }

    res.redirect('/admin/backups?success=Respaldo creado exitosamente');
  } catch (err) {
    console.error('Backup error:', err);
    res.redirect('/admin/backups?error=' + encodeURIComponent('Error en respaldo: ' + err.message));
  }
});

// Upload and restore backup
const backupUpload = multer({
  dest: BACKUPS_DIR,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.gz')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .gz'));
    }
  }
});

router.post('/backups/restore', backupUpload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No se subio ningun archivo de respaldo');
    }

    const uploadedPath = req.file.path;

    // Try docker exec first, fall back to direct mongorestore
    try {
      const containerNames = ['testquest-mongo-1', 'testquest_mongo_1', 'mongo', 'mongodb'];
      let success = false;

      for (const containerName of containerNames) {
        try {
          execSync(`docker exec -i ${containerName} mongorestore --archive --gzip --drop --db testquiz < "${uploadedPath}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
          });
          success = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!success) {
        throw new Error('No docker container found');
      }
    } catch (dockerErr) {
      // Fall back to direct mongorestore (if MongoDB is on localhost)
      execSync(`mongorestore --uri="${process.env.MONGODB_URI}" --archive="${uploadedPath}" --gzip --drop`, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }

    // Rename uploaded file to keep it in backups
    const newFilename = `restored-${Date.now()}-${req.file.originalname}`;
    fs.renameSync(uploadedPath, path.join(BACKUPS_DIR, newFilename));

    res.redirect('/admin/backups?success=Respaldo restaurado exitosamente');
  } catch (err) {
    console.error('Restore error:', err);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.redirect('/admin/backups?error=' + encodeURIComponent('Error en restauracion: ' + err.message));
  }
});

router.get('/backups/:filename/download', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).send('Nombre de archivo invalido');
    }

    const filePath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Respaldo no encontrado');
    }

    res.download(filePath, filename);
  } catch (err) {
    res.status(500).send('Error en descarga');
  }
});

router.post('/backups/:filename/delete', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).send('Nombre de archivo invalido');
    }

    const filePath = path.join(BACKUPS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.redirect('/admin/backups?success=Respaldo eliminado');
  } catch (err) {
    res.redirect('/admin/backups?error=' + encodeURIComponent('Error al eliminar: ' + err.message));
  }
});

// ===== MESSAGING SYSTEM =====

// Get unread count for admin badge
router.get('/messages/unread-count', async (req, res) => {
  try {
    const count = await Message.countDocuments({
      sender: 'user',
      readByAdmin: false,
      deletedAt: null
    });
    res.json({ success: true, count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin messages page - list all conversations by submission (case)
router.get('/messages', async (req, res) => {
  try {
    // Get all conversations grouped by submission
    const conversations = await Message.aggregate([
      { $match: { deletedAt: null, submission: { $ne: null } } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$submission',
        user: { $first: '$user' },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'user'] }, { $eq: ['$readByAdmin', false] }] }, 1, 0] } },
        messageCount: { $sum: 1 }
      }},
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    // Populate submission and user details
    const submissionIds = conversations.map(c => c._id);
    const userIds = conversations.map(c => c.user);

    const [submissions, users] = await Promise.all([
      Submission.find({ _id: { $in: submissionIds } })
        .populate('testCase', 'title')
        .select('testCase status feedback screenshot createdAt'),
      User.find({ _id: { $in: userIds } }).select('username')
    ]);

    const submissionMap = {};
    submissions.forEach(s => { submissionMap[s._id.toString()] = s; });
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const result = conversations.map(c => ({
      submission: submissionMap[c._id.toString()],
      user: userMap[c.user.toString()],
      lastMessage: c.lastMessage,
      unreadCount: c.unreadCount,
      messageCount: c.messageCount
    })).filter(c => c.submission && c.user);

    res.render('admin/messages', { conversations: result });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).send('Error loading messages');
  }
});

// Get conversation with specific user
router.get('/messages/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({ user: userId, deletedAt: null })
      .populate('submission', 'testCase status createdAt')
      .sort('createdAt');

    // Populate submission test case
    await Submission.populate(messages.map(m => m.submission).filter(s => s), {
      path: 'testCase',
      select: 'title'
    });

    // Mark all user messages as read by admin
    await Message.updateMany(
      { user: userId, sender: 'user', readByAdmin: false, deletedAt: null },
      { $set: { readByAdmin: true } }
    );

    const user = await User.findById(userId).select('username email');

    res.json({ success: true, messages, user });
  } catch (err) {
    console.error('Get user messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a specific submission (case-based chat)
router.get('/messages/submission/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;

    // Get the submission with case details and user submission data
    const submission = await Submission.findById(submissionId)
      .populate('user', 'username')
      .populate('testCase', 'title description scenario expectedResult')
      .select('user testCase status feedback screenshot createdAt');

    if (!submission) {
      return res.status(404).json({ error: 'Envio no encontrado' });
    }

    // Get only messages linked to this submission
    const messages = await Message.find({ submission: submissionId, deletedAt: null })
      .sort('createdAt');

    // Mark user messages as read by admin
    await Message.updateMany(
      { submission: submissionId, sender: 'user', readByAdmin: false, deletedAt: null },
      { $set: { readByAdmin: true } }
    );

    res.json({ success: true, messages, submission });
  } catch (err) {
    console.error('Get submission messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send message linked to a submission
router.post('/messages/submission/:submissionId', messageUpload.single('screenshot'), async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { content } = req.body;
    const screenshot = req.file ? req.file.filename : null;

    if ((!content || !content.trim()) && !screenshot) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacio' });
    }

    // Get the submission to know the user
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Envio no encontrado' });
    }

    const message = await Message.create({
      user: submission.user,
      submission: submissionId,
      sender: 'admin',
      content: content ? content.trim() : '',
      screenshot,
      readByAdmin: true
    });

    res.json({ success: true, message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send message to user (with optional screenshot)
router.post('/messages/user/:userId', messageUpload.single('screenshot'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { content, submissionId } = req.body;
    const screenshot = req.file ? req.file.filename : null;

    if ((!content || !content.trim()) && !screenshot) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacio' });
    }

    const message = await Message.create({
      user: userId,
      submission: submissionId || null,
      sender: 'admin',
      content: content ? content.trim() : '',
      screenshot,
      readByAdmin: true
    });

    // Populate for response
    await message.populate('submission', 'testCase status createdAt');
    if (message.submission) {
      await Submission.populate(message.submission, { path: 'testCase', select: 'title' });
    }

    res.json({ success: true, message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Soft delete conversation with user
router.delete('/messages/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    await Message.updateMany(
      { user: userId, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
