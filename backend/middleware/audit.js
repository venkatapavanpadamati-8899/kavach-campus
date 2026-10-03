/**
 * KAVACH CAMPUS — Audit Logger Middleware
 */

const { v4: uuid } = require('uuid');
const { getDatabase, runQuery } = require('../db/database');

async function logAudit(userId, userRole, action, targetType, targetId, metadata, req) {
  try {
    const db = await getDatabase();
    runQuery(db,
      `INSERT INTO audit_logs (id, user_id, user_role, action, target_type, target_id, metadata, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuid(), userId, userRole, action, targetType, targetId,
       metadata ? JSON.stringify(metadata) : null,
       req ? (req.ip || req.connection?.remoteAddress) : null,
       req ? req.headers['user-agent'] : null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// Middleware to auto-log requests
function auditMiddleware(action, targetType) {
  return (req, res, next) => {
    const originalEnd = res.end;
    res.end = function (...args) {
      if (res.statusCode < 400 && req.user) {
        logAudit(req.user.id, req.user.role, action, targetType,
          req.params.id || req.params.caseId || null, null, req);
      }
      originalEnd.apply(res, args);
    };
    next();
  };
}

module.exports = { logAudit, auditMiddleware };
