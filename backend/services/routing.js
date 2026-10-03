/**
 * KAVACH CAMPUS — Case Routing Service
 * Routes cases to appropriate staff based on severity, category, and department
 */

const { v4: uuid } = require('uuid');
const { queryAll, queryOne, runQuery } = require('../db/database');

// Default routing rules
const ROUTING_MAP = {
  L1: ['MENTOR', 'COUNSELOR'],
  L2: ['HOD', 'COUNSELOR', 'WOMENS_CELL'],
  L3: ['SECURITY', 'HOD', 'WOMENS_CELL'],
  L4: ['SECURITY', 'PRINCIPAL', 'SUPER_ADMIN']
};

// Category-specific routing overrides
const CATEGORY_ROUTING = {
  'SEXUAL_HARASSMENT': ['WOMENS_CELL', 'SECURITY', 'PRINCIPAL'],
  'STALKING': ['SECURITY', 'WOMENS_CELL', 'HOD'],
  'FIRE': ['SECURITY', 'PRINCIPAL', 'SUPER_ADMIN'],
  'MEDICAL': ['SECURITY', 'PRINCIPAL'],
  'MENTAL_HEALTH': ['COUNSELOR', 'WOMENS_CELL'],
  'RAGGING': ['HOD', 'COUNSELOR', 'PRINCIPAL'],
  'SUBSTANCE_ABUSE': ['HOD', 'COUNSELOR', 'PRINCIPAL'],
  'DISCRIMINATION': ['COUNSELOR', 'HOD', 'WOMENS_CELL', 'PRINCIPAL'],
};

/**
 * Route a case to appropriate staff members
 */
async function routeCase(db, caseId, severity, urgency, category, reporter, requiresHumanReview = 0) {
  // Determine which roles should receive this case
  let targetRoles = ROUTING_MAP[severity] || ROUTING_MAP.L1;

  // Category-specific overrides
  if (category && CATEGORY_ROUTING[category]) {
    targetRoles = [...new Set([...CATEGORY_ROUTING[category], ...targetRoles])];
  }

  // If AI flagged for human review (or low confidence), ensure higher-level staff are involved
  if (requiresHumanReview) {
    targetRoles = [...new Set([...targetRoles, 'PRINCIPAL', 'SUPER_ADMIN'])];
  }

  // Find staff members matching these roles
  for (const role of targetRoles) {
    let sql = 'SELECT id, full_name, role, department FROM users WHERE role = ? AND is_active = 1';
    const params = [role];

    // For HOD, prefer same department
    if (role === 'HOD' && reporter && reporter.department) {
      sql += ' AND (department = ? OR department IS NULL)';
      params.push(reporter.department);
    }

    const staffMembers = queryAll(db, sql, params);

    for (const staff of staffMembers) {
      // Create routing record
      runQuery(db,
        `INSERT INTO case_routing (id, case_id, routed_to, role, reason, notified, notified_at)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
        [uuid(), caseId, staff.id, staff.role, `Auto-routed: ${severity} ${category || 'case'}`]
      );

      // Create notification
      const caseData = queryOne(db, 'SELECT case_number FROM cases WHERE id = ?', [caseId]);
      runQuery(db,
        `INSERT INTO notifications (id, user_id, type, title, message, case_id)
         VALUES (?, ?, 'NEW_CASE', ?, ?, ?)`,
        [uuid(), staff.id,
         `New ${severity} Case Assigned`,
         `A new ${severity} priority case (${caseData ? caseData.case_number : ''}) requires your attention.`,
         caseId]
      );
    }
  }

  // Timeline entry
  runQuery(db,
    `INSERT INTO case_timeline (id, case_id, action, description)
     VALUES (?, ?, 'ROUTED', ?)`,
    [uuid(), caseId, `Routed to: ${targetRoles.join(', ')}`]
  );
}

module.exports = { routeCase, ROUTING_MAP, CATEGORY_ROUTING };
