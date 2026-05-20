const jwt    = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'bookeasy_jwt_secret_2026';

function authenticateUser(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'No token provided' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'Admin access required' });
  next();
}

module.exports = { authenticateUser, requireAdmin };
