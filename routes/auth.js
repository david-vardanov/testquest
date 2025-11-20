const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
  res.render('auth/login');
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, isActive: true });

    if (!user || !(await user.comparePassword(password))) {
      return res.render('auth/login', { error: 'Invalid credentials' });
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      points: user.points
    };

    if (user.role === 'superadmin') {
      return res.redirect('/admin');
    }
    res.redirect('/tester');
  } catch (err) {
    res.render('auth/login', { error: 'Login failed' });
  }
});

router.get('/register', (req, res) => {
  res.render('auth/register');
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password, role: 'tester' });
    await user.save();
    res.redirect('/login');
  } catch (err) {
    res.render('auth/register', { error: 'Registration failed. Username or email may already exist.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
