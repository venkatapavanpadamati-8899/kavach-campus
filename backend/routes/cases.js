/**
 * KAVACH CAMPUS — Cases Routes
 * Report, SOS, Case Management, AI Analysis, Routing
 */

const express = require('express');
const { v4: uuid } = require('uuid');
const { getDatabase, queryAll, queryOne, runQuery } = require('../db/database');
const { authenticate, isStaff, isAdmin, STAFF_ROLES } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { analyzeComplaint } = require('../services/ai');
const { routeCase } = require('../services/routing');
const { notifyStaff, notifyUser } = require('../services/websocket');

const router = express.Router();

// Generate case number: KC-YYYY-NNNNN
function generateCaseNumber(db) {
  const year = new Date().getFullYear();
  const result = db.exec(`SELECT COUNT(*) as c FROM cases WHERE case_number LIKE 'KC-${year}%'`);
  const count = (result[0] ? result[0].values[0][0] : 0) + 1;
  return `KC-${year}-${String(count).padStart(5, '0')}`;
}

// ── CREATE CASE (Student Report) ──
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      description, category, is_emergency, is_sos, is_anonymous,
      latitude, longitude, accuracy, location_name, campus_zone,
      original_language, voice_recording_url
    } = req.body;

    if (!description && !is_sos) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const db = await getDatabase();

    // Prevent duplicate active SOS cases
    if (is_sos) {
      const activeSos = queryOne(db, 
        `SELECT id, case_number, status FROM cases 
         WHERE reporter_id = ? AND is_sos = 1 AND status NOT IN ('RESOLVED', 'CLOSED')`, 
        [req.user.id]
      );
      if (activeSos) {
        return res.status(200).json({
          message: 'SOS alert is already active',
          case: { id: activeSos.id, caseNumber: activeSos.case_number, status: activeSos.status, is_sos: true }
        });
      }
    }

    const id = uuid();
    const caseNumber = generateCaseNumber(db);

    runQuery(db,
      `INSERT INTO cases (id, case_number, reporter_id, description, category,
        is_emergency, is_sos, is_anonymous, latitude, longitude, accuracy, location_name,
        campus_zone, department, original_language, original_text, voice_recording_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, caseNumber, req.user.id, description || 'SOS Emergency Alert',
       category || null, is_emergency ? 1 : 0, is_sos ? 1 : 0, is_anonymous ? 1 : 0,
       latitude || null, longitude || null, accuracy || null,
       location_name || null, campus_zone || null,
       req.user.department || null, original_language || 'en',
       description || null, voice_recording_url || null]
    );

    // Create timeline entry
    runQuery(db,
      `INSERT INTO case_timeline (id, case_id, action, description, performed_by, performer_role)
       VALUES (?, ?, 'CREATED', ?, ?, ?)`,
      [uuid(), id, is_sos ? 'SOS Emergency Alert Activated' : 'Case reported',
       req.user.id, req.user.role]
    );

    // AI Analysis (async - don't block response)
    analyzeAndRoute(db, id, description || 'SOS Emergency', is_sos, req.user).catch(err => {
      console.error('AI analysis error:', err.message);
    });

    logAudit(req.user.id, req.user.role, 'CREATE_CASE', 'CASE', id, { caseNumber, is_sos }, req);

    const payload = {
      id, caseNumber, status: 'OPEN', is_sos: !!is_sos, 
      severity: is_sos ? 'L4' : 'L1', 
      description: description || 'SOS Emergency Alert'
    };

    // Notify Staff
    notifyStaff('CASE_CREATED', payload);

    res.status(201).json({
      message: is_sos ? 'SOS alert activated' : 'Case reported successfully',
      case: payload
    });
  } catch (err) {
    console.error('Create case error:', err);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// AI analysis + routing logic
async function analyzeAndRoute(db, caseId, description, isSos, user) {
  let severity = 'L1';
  let urgency = 'NORMAL';
  let aiCategory = null;
  let aiConfidence = null;
  let aiExplanation = null;
  let requiresHumanReview = 0;

  // If SOS, force L4
  if (isSos) {
    severity = 'L4';
    urgency = 'CRITICAL';
    aiCategory = 'EMERGENCY';
    aiConfidence = 1.0;
    aiExplanation = 'SOS emergency activated by student';
  } else {
    // Try AI analysis
    const analysis = await analyzeComplaint(description);
    if (analysis) {
      severity = analysis.severity || 'L1';
      urgency = analysis.urgency || 'NORMAL';
      aiCategory = analysis.category || null;
      aiConfidence = analysis.confidence || null;
      aiExplanation = analysis.explanation || null;
      requiresHumanReview = analysis.requires_human_review ? 1 : 0;
      
      // Force human review if AI confidence is low
      if (aiConfidence !== null && aiConfidence < 0.7) {
        requiresHumanReview = 1;
      }

      runQuery(db,
        `UPDATE cases SET ai_category = ?, ai_severity = ?, ai_urgency = ?,
         ai_confidence = ?, ai_explanation = ?, ai_model = ?,
         ai_analyzed_at = datetime('now'), severity = ?, urgency = ?,
         category = COALESCE(category, ?), requires_human_review = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [aiCategory, severity, urgency, aiConfidence, aiExplanation,
         analysis.model || 'rule-engine', severity, urgency, aiCategory, requiresHumanReview, caseId]
      );

      // Timeline: AI analyzed
      runQuery(db,
        `INSERT INTO case_timeline (id, case_id, action, description, metadata)
         VALUES (?, ?, 'AI_ANALYZED', ?, ?)`,
        [uuid(), caseId, `AI classified as ${aiCategory} (${severity}) with ${Math.round((aiConfidence || 0) * 100)}% confidence${requiresHumanReview ? ' [HUMAN REVIEW REQUIRED]' : ''}`,
         JSON.stringify(analysis)]
      );
    }
  }

  if (isSos) {
    runQuery(db,
      `UPDATE cases SET severity = 'L4', urgency = 'CRITICAL', ai_category = 'EMERGENCY',
       ai_severity = 'L4', ai_confidence = 1.0, ai_explanation = 'SOS emergency activated',
       ai_analyzed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [caseId]
    );
  }

  // Route the case
  await routeCase(db, caseId, severity, urgency, aiCategory, user, requiresHumanReview);
}

// ── GET MY CASES (Student) ──
router.get('/my', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    const cases = queryAll(db,
      `SELECT id, case_number, category, severity, urgency, status, is_emergency, is_sos, is_anonymous,
        description, location_name, created_at, updated_at, ai_confidence
       FROM cases WHERE reporter_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// ── GET CASE DETAILS ──
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    const caseData = queryOne(db, 'SELECT * FROM cases WHERE id = ?', [req.params.id]);

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Access control
    const isReporter = caseData.reporter_id === req.user.id;
    const isStaffRole = STAFF_ROLES.includes(req.user.role);

    if (!isReporter && !isStaffRole) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get timeline
    const timeline = queryAll(db,
      'SELECT * FROM case_timeline WHERE case_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    // Get evidence (authorized only)
    const evidence = queryAll(db,
      'SELECT id, type, file_name, file_size, mime_type, created_at FROM evidence WHERE case_id = ?',
      [req.params.id]
    );

    // Get routing info (staff only)
    let routing = [];
    if (isStaffRole) {
      routing = queryAll(db,
        `SELECT cr.*, u.full_name as staff_name FROM case_routing cr
         LEFT JOIN users u ON cr.routed_to = u.id WHERE cr.case_id = ?`,
        [req.params.id]
      );
    }

    // Role-based field filtering
    let responseCase = { ...caseData };
    if (responseCase.is_anonymous && responseCase.reporter_id !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      delete responseCase.reporter_id;
    }
    
    if (req.user.role === 'SECURITY') {
      // Security sees limited info
      delete responseCase.reporter_id;
      delete responseCase.original_text;
    }

    logAudit(req.user.id, req.user.role, 'VIEW_CASE', 'CASE', req.params.id, null, req);

    res.json({ case: responseCase, timeline, evidence, routing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case details' });
  }
});

// ── GET ALL CASES (Staff/Admin) ──
router.get('/', authenticate, isStaff, async (req, res) => {
  try {
    const { status, severity, category, page = 1, limit = 20 } = req.query;
    const db = await getDatabase();

    let sql = `SELECT c.id, c.case_number, c.category, c.severity, c.urgency, c.status,
      c.is_emergency, c.is_sos, c.is_anonymous, c.description, c.location_name, c.campus_zone,
      c.department, c.assigned_to, c.created_at, c.updated_at, c.ai_confidence,
      CASE WHEN c.is_anonymous = 1 AND ? != 'SUPER_ADMIN' THEN 'Anonymous' ELSE u.full_name END as reporter_name
      FROM cases c LEFT JOIN users u ON c.reporter_id = u.id WHERE 1=1`;
    const params = [req.user.role];

    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    if (severity) { sql += ' AND c.severity = ?'; params.push(severity); }
    if (category) { sql += ' AND c.category = ?'; params.push(category); }

    // Department filter for HOD
    if (req.user.role === 'HOD' && req.user.department) {
      sql += ' AND c.department = ?';
      params.push(req.user.department);
    }

    sql += ` ORDER BY
      CASE c.severity WHEN 'L4' THEN 1 WHEN 'L3' THEN 2 WHEN 'L2' THEN 3 ELSE 4 END,
      c.created_at DESC`;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const cases = queryAll(db, sql, params);

    // Get total count
    const countResult = db.exec("SELECT COUNT(*) FROM cases");
    const total = countResult[0] ? countResult[0].values[0][0] : 0;

    res.json({ cases, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get cases error:', err);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// ── ACKNOWLEDGE CASE ──
router.post('/:id/acknowledge', authenticate, isStaff, async (req, res) => {
  try {
    const db = await getDatabase();
    const caseData = queryOne(db, 'SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    runQuery(db,
      `UPDATE cases SET status = 'ACKNOWLEDGED', acknowledged_by = ?,
       acknowledged_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [req.user.id, req.params.id]
    );

    runQuery(db,
      `INSERT INTO case_timeline (id, case_id, action, description, performed_by, performer_role)
       VALUES (?, ?, 'ACKNOWLEDGED', ?, ?, ?)`,
      [uuid(), req.params.id, `Case acknowledged by ${req.user.name}`,
       req.user.id, req.user.role]
    );

    // Update routing
    runQuery(db,
      `UPDATE case_routing SET acknowledged = 1, acknowledged_at = datetime('now')
       WHERE case_id = ? AND routed_to = ?`,
      [req.params.id, req.user.id]
    );

    // Notify student
    runQuery(db,
      `INSERT INTO notifications (id, user_id, type, title, message, case_id)
       VALUES (?, ?, 'CASE_UPDATE', 'Case Acknowledged', ?, ?)`,
      [uuid(), caseData.reporter_id, `Your case ${caseData.case_number} has been acknowledged.`,
       req.params.id]
    );

    logAudit(req.user.id, req.user.role, 'ACKNOWLEDGE_CASE', 'CASE', req.params.id, null, req);
    res.json({ message: 'Case acknowledged' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to acknowledge case' });
  }
});

// ── ASSIGN CASE ──
router.post('/:id/assign', authenticate, isStaff, async (req, res) => {
  try {
    const { assigned_to } = req.body;
    if (!assigned_to) return res.status(400).json({ error: 'Assignee is required' });

    const db = await getDatabase();
    runQuery(db,
      `UPDATE cases SET status = 'ASSIGNED', assigned_to = ?, updated_at = datetime('now') WHERE id = ?`,
      [assigned_to, req.params.id]
    );

    const assignee = queryOne(db, 'SELECT full_name FROM users WHERE id = ?', [assigned_to]);

    runQuery(db,
      `INSERT INTO case_timeline (id, case_id, action, description, performed_by, performer_role)
       VALUES (?, ?, 'ASSIGNED', ?, ?, ?)`,
      [uuid(), req.params.id, `Assigned to ${assignee ? assignee.full_name : 'staff'}`,
       req.user.id, req.user.role]
    );

    logAudit(req.user.id, req.user.role, 'ASSIGN_CASE', 'CASE', req.params.id, { assigned_to }, req);
    res.json({ message: 'Case assigned' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign case' });
  }
});

// ── ADD NOTE ──
router.post('/:id/notes', authenticate, isStaff, async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ error: 'Note is required' });

    const db = await getDatabase();
    runQuery(db,
      `INSERT INTO case_timeline (id, case_id, action, description, performed_by, performer_role)
       VALUES (?, ?, 'NOTE_ADDED', ?, ?, ?)`,
      [uuid(), req.params.id, note, req.user.id, req.user.role]
    );

    runQuery(db, `UPDATE cases SET updated_at = datetime('now') WHERE id = ?`, [req.params.id]);

    logAudit(req.user.id, req.user.role, 'ADD_NOTE', 'CASE', req.params.id, null, req);
    res.json({ message: 'Note added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// ── ESCALATE CASE ──
router.post('/:id/escalate', authenticate, isStaff, async (req, res) => {
  try {
    const { reason } = req.body;
    const db = await getDatabase();
    const caseData = queryOne(db, 'SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const newLevel = (caseData.escalation_level || 0) + 1;

    runQuery(db,
      `UPDATE cases SET status = 'ESCALATED', escalation_level = ?,
       last_escalated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [newLevel, req.params.id]
    );

    runQuery(db,
      `INSERT INTO case_timeline (id, case_id, action, description, performed_by, performer_role)
       VALUES (?, ?, 'ESCALATED', ?, ?, ?)`,
      [uuid(), req.params.id, `Escalated to level ${newLevel}. Reason: ${reason || 'No reason provided'}`,
       req.user.id, req.user.role]
    );

    logAudit(req.user.id, req.user.role, 'ESCALATE_CASE', 'CASE', req.params.id, { newLevel, reason }, req);
    
    // Notify staff
    notifyStaff('CASE_ESCALATED', {
      id: req.params.id,
      caseNumber: caseData.case_number,
      escalation_level: newLevel,
      reason
    });

    res.json({ message: 'Case escalated', escalation_level: newLevel });
  } catch (err) {
    res.status(500).json({ error: 'Failed to escalate case' });
  }
});

// ── RESOLVE CASE ──
router.post('/:id/resolve', authenticate, isStaff, async (req, res) => {
  try {
    const { resolution_notes } = req.body;
    if (!resolution_notes) return res.status(400).json({ error: 'Resolution notes are required' });

    const db = await getDatabase();
    const caseData = queryOne(db, 'SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    runQuery(db,
      `UPDATE cases SET status = 'RESOLVED', resolved_by = ?, resolved_at = datetime('now'),
       resolution_notes = ?, updated_at = datetime('now') WHERE id = ?`,
      [req.user.id, resolution_notes, req.params.id]
    );

    runQuery(db,
      `INSERT INTO case_timeline (id, case_id, action, description, performed_by, performer_role)
       VALUES (?, ?, 'RESOLVED', ?, ?, ?)`,
      [uuid(), req.params.id, `Resolved: ${resolution_notes}`, req.user.id, req.user.role]
    );

    // Notify student
    runQuery(db,
      `INSERT INTO notifications (id, user_id, type, title, message, case_id)
       VALUES (?, ?, 'CASE_RESOLVED', 'Case Resolved', ?, ?)`,
      [uuid(), caseData.reporter_id, `Your case ${caseData.case_number} has been resolved.`,
       req.params.id]
    );

    logAudit(req.user.id, req.user.role, 'RESOLVE_CASE', 'CASE', req.params.id, { resolution_notes }, req);
    res.json({ message: 'Case resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve case' });
  }
});

// ── DASHBOARD STATS ──
router.get('/stats/overview', authenticate, isStaff, async (req, res) => {
  try {
    const db = await getDatabase();

    const stats = {};
    const queries = {
      total: "SELECT COUNT(*) FROM cases",
      open: "SELECT COUNT(*) FROM cases WHERE status IN ('OPEN','ACKNOWLEDGED','ASSIGNED','IN_PROGRESS')",
      critical: "SELECT COUNT(*) FROM cases WHERE severity = 'L4' AND status != 'RESOLVED' AND status != 'CLOSED'",
      escalated: "SELECT COUNT(*) FROM cases WHERE status = 'ESCALATED'",
      resolved: "SELECT COUNT(*) FROM cases WHERE status = 'RESOLVED' OR status = 'CLOSED'",
      sos_active: "SELECT COUNT(*) FROM cases WHERE is_sos = 1 AND status NOT IN ('RESOLVED','CLOSED')",
      today: "SELECT COUNT(*) FROM cases WHERE date(created_at) = date('now')"
    };

    for (const [key, sql] of Object.entries(queries)) {
      const result = db.exec(sql);
      stats[key] = result[0] ? result[0].values[0][0] : 0;
    }

    // Severity breakdown
    const severityResult = queryAll(db,
      "SELECT severity, COUNT(*) as count FROM cases WHERE status NOT IN ('RESOLVED','CLOSED') GROUP BY severity"
    );
    stats.by_severity = {};
    for (const row of severityResult) {
      stats.by_severity[row.severity] = row.count;
    }

    // Category breakdown
    const categoryResult = queryAll(db,
      "SELECT category, COUNT(*) as count FROM cases WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 10"
    );
    stats.top_categories = categoryResult;

    res.json({ stats });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
