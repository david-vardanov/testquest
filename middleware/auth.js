module.exports.isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

module.exports.isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'superadmin') {
    return res.redirect('/login');
  }
  next();
};

module.exports.isTester = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};
