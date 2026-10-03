const { getDatabase, runQuery, queryAll } = require('../db/database');
const { notifyStaff } = require('./websocket');
const { v4: uuid } = require('uuid');

// Check every 60 seconds
const CHECK_INTERVAL_MS = 60000;

// Configurable response limits in minutes
const ESCALATION_LIMITS_MINUTES = {
  'L4': 2,
  'L3': 5,
  'L2': 10,
  'L1': 15
};

async function checkEscalations() {
  try {
    const db = await getDatabase();
    
    // Find all cases that are OPEN (not yet acknowledged)
    const openCases = queryAll(db, "SELECT * FROM cases WHERE status = 'OPEN'");
    
    const now = new Date();

    for (const caseData of openCases) {
      const createdTime = new Date(caseData.created_at);
      const diffMs = now.getTime() - createdTime.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      
      const limit = ESCALATION_LIMITS_MINUTES[caseData.severity] || 15;
      
      if (diffMinutes >= limit) {
        // Escalate this case
        const newLevel = (caseData.escalation_level || 0) + 1;
        const reason = `Automated escalation: Not acknowledged within ${limit} minutes.`;

        runQuery(db,
          `UPDATE cases SET status = 'ESCALATED', escalation_level = ?,
           last_escalated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
          [newLevel, caseData.id]
        );

        runQuery(db,
          `INSERT INTO case_timeline (id, case_id, action, description, performed_by, performer_role)
           VALUES (?, ?, 'ESCALATED', ?, ?, ?)`,
          [uuid(), caseData.id, reason, 'SYSTEM', 'SYSTEM']
        );

        console.log(`[Escalation Engine] Escalated case ${caseData.case_number} to level ${newLevel}`);

        notifyStaff('CASE_ESCALATED', {
          id: caseData.id,
          caseNumber: caseData.case_number,
          escalation_level: newLevel,
          reason
        });
      }
    }
  } catch (err) {
    console.error('[Escalation Engine] Error checking escalations:', err);
  }
}

let intervalId;

function startEscalationEngine() {
  console.log('[Escalation Engine] Started');
  checkEscalations();
  intervalId = setInterval(checkEscalations, CHECK_INTERVAL_MS);
}

function stopEscalationEngine() {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('[Escalation Engine] Stopped');
  }
}

module.exports = {
  startEscalationEngine,
  stopEscalationEngine,
  checkEscalations
};
