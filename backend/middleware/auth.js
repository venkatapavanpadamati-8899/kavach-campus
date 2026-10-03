/**
 * KAVACH CAMPUS — Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const { getDatabase, queryOne } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'kavach-dev-secret-change-in-production';

// Verify JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}

// Role-based authorization
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
    }
    next();
  };
}

// Staff or higher roles
const STAFF_ROLES = ['STAFF', 'MENTOR', 'COUNSELOR', 'HOD', 'SECURITY', 'WOMENS_CELL', 'PRINCIPAL', 'ADMIN', 'SUPER_ADMIN'];
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const MANAGEMENT_ROLES = ['PRINCIPAL', 'ADMIN', 'SUPER_ADMIN'];

function isStaff(req, res, next) {
  return authorize(...STAFF_ROLES)(req, res, next);
}

function isAdmin(req, res, next) {
  return authorize(...ADMIN_ROLES)(req, res, next);
}

function isManagement(req, res, next) {
  return authorize(...MANAGEMENT_ROLES)(req, res, next);
}

module.exports = {
  authenticate,
  authorize,
  isStaff,
  isAdmin,
  isManagement,
  JWT_SECRET,
  STAFF_ROLES,
  ADMIN_ROLES,
  MANAGEMENT_ROLES
};
