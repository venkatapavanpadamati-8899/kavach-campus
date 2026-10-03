/**
 * KAVACH CAMPUS — Main Server
 * Express server serving API + static frontend
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const { getDatabase, queryAll, queryOne, runQuery, saveDatabase } = require('./db/database');
const { authenticate, isStaff, isAdmin, isManagement } = require('./middleware/auth');
const { logAudit } = require('./middleware/audit');
const http = require('http');
const { initWebSocket } = require('./services/websocket');
const { startEscalationEngine } = require('./services/escalation-engine');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket
initWebSocket(server);

// ── Security Middleware ──
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles for development
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// ── Rate Limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static Files (Frontend) ──
app.use(express.static(path.join(__dirname, '..'), {
  index: 'index.html',
  extensions: ['html']
}));

// ── File Upload Config ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'evidence'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm',
      'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mpeg',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// ── API Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cases', require('./routes/cases'));

// ── Evidence Upload ──
app.post('/api/evidence/upload', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    const { case_id } = req.body;
    if (!case_id) return res.status(400).json({ error: 'Case ID is required' });

    const db = await getDatabase();
    const caseData = queryOne(db, 'SELECT id, reporter_id FROM cases WHERE id = ?', [case_id]);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    // Verify access
    if (caseData.reporter_id !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to upload evidence for this case' });
    }

    const evidenceItems = [];
    for (const file of req.files) {
      const evidenceId = uuid();
      const type = file.mimetype.startsWith('image') ? 'IMAGE' :
                    file.mimetype.startsWith('video') ? 'VIDEO' :
                    file.mimetype.startsWith('audio') ? 'AUDIO' : 'DOCUMENT';

      runQuery(db,
        `INSERT INTO evidence (id, case_id, type, file_path, file_name, file_size, mime_type, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [evidenceId, case_id, type, file.filename, file.originalname,
         file.size, file.mimetype, req.user.id]
      );

      evidenceItems.push({ id: evidenceId, type, file_name: file.originalname });
    }

    // Timeline
    runQuery(db,
      `INSERT INTO case_timeline (id, case_id, action, description, performed_by, performer_role)
       VALUES (?, ?, 'EVIDENCE_ADDED', ?, ?, ?)`,
      [uuid(), case_id, `${req.files.length} file(s) uploaded`, req.user.id, req.user.role]
    );

    logAudit(req.user.id, req.user.role, 'UPLOAD_EVIDENCE', 'EVIDENCE', case_id,
      { count: req.files.length }, req);

    res.json({ message: 'Evidence uploaded', evidence: evidenceItems });
  } catch (err) {
    console.error('Evidence upload error:', err);
    res.status(500).json({ error: 'Failed to upload evidence' });
  }
});

// ── Evidence Download (Authorized) ──
app.get('/api/evidence/:id/download', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    const evidence = queryOne(db,
      `SELECT e.*, c.reporter_id FROM evidence e
       JOIN cases c ON e.case_id = c.id WHERE e.id = ?`,
      [req.params.id]
    );

    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    // Access control
    const isReporter = evidence.reporter_id === req.user.id;
    const isAuthorized = ['ADMIN', 'SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'SECURITY', 'COUNSELOR', 'WOMENS_CELL'].includes(req.user.role);

    if (!isReporter && !isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to access this evidence' });
    }

    logAudit(req.user.id, req.user.role, 'DOWNLOAD_EVIDENCE', 'EVIDENCE', req.params.id, null, req);

    const filePath = path.join(__dirname, '..', 'uploads', 'evidence', evidence.file_path);
    res.download(filePath, evidence.file_name);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download evidence' });
  }
});

// ── Notifications ──
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    const notifications = queryAll(db,
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const unreadCount = queryOne(db,
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ notifications, unread: unreadCount ? unreadCount.count : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    runQuery(db,
      'UPDATE notifications SET is_read = 1, read_at = datetime("now") WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

app.put('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    runQuery(db,
      'UPDATE notifications SET is_read = 1, read_at = datetime("now") WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// ── Trusted Contacts ──
app.get('/api/trusted-contacts', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    const contacts = queryAll(db,
      'SELECT * FROM trusted_contacts WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

app.post('/api/trusted-contacts', authenticate, async (req, res) => {
  try {
    const { name, relationship, phone } = req.body;
    if (!name || !relationship || !phone) {
      return res.status(400).json({ error: 'Name, relationship, and phone are required' });
    }

    const db = await getDatabase();
    const id = uuid();
    runQuery(db,
      'INSERT INTO trusted_contacts (id, user_id, name, relationship, phone) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, name, relationship, phone]
    );
    res.status(201).json({ message: 'Contact added', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

app.delete('/api/trusted-contacts/:id', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    runQuery(db,
      'DELETE FROM trusted_contacts WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Contact removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove contact' });
  }
});

// ── Safe Walk ──
app.post('/api/safe-walk/start', authenticate, async (req, res) => {
  try {
    const { destination, expected_minutes, start_lat, start_lng, end_lat, end_lng } = req.body;
    if (!destination || !expected_minutes) {
      return res.status(400).json({ error: 'Destination and expected time are required' });
    }

    const db = await getDatabase();
    const id = uuid();
    runQuery(db,
      `INSERT INTO safe_walks (id, user_id, destination, expected_minutes, start_lat, start_lng, end_lat, end_lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, destination, expected_minutes,
       start_lat || null, start_lng || null, end_lat || null, end_lng || null]
    );
    res.status(201).json({ message: 'Safe walk started', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start safe walk' });
  }
});

app.put('/api/safe-walk/:id/complete', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    runQuery(db,
      `UPDATE safe_walks SET status = 'COMPLETED', completed_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Safe walk completed. Stay safe!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete safe walk' });
  }
});

app.get('/api/safe-walk/active', authenticate, async (req, res) => {
  try {
    const db = await getDatabase();
    const walk = queryOne(db,
      "SELECT * FROM safe_walks WHERE user_id = ? AND status = 'ACTIVE' ORDER BY started_at DESC LIMIT 1",
      [req.user.id]
    );
    res.json({ walk });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch safe walk' });
  }
});

// ── Admin: Users Management ──
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const users = queryAll(db,
      `SELECT id, full_name, email, phone, role, student_id, department, year,
        is_verified, is_active, created_at, last_login
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/admin/users/:id/role', authenticate, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['STUDENT', 'STAFF', 'MENTOR', 'COUNSELOR', 'HOD',
                        'SECURITY', 'WOMENS_CELL', 'PRINCIPAL', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Only SUPER_ADMIN can create ADMIN/SUPER_ADMIN
    if (['ADMIN', 'SUPER_ADMIN'].includes(role) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admin can assign admin roles' });
    }

    const db = await getDatabase();
    runQuery(db, 'UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?',
      [role, req.params.id]);

    logAudit(req.user.id, req.user.role, 'CHANGE_ROLE', 'USER', req.params.id, { newRole: role }, req);
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ── Admin: AI Config ──
app.get('/api/admin/ai-config', authenticate, isAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const configs = queryAll(db, 'SELECT * FROM ai_config');
    const configMap = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }
    res.json({ config: configMap });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AI config' });
  }
});

app.put('/api/admin/ai-config', authenticate, isAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Config key is required' });

    const db = await getDatabase();
    runQuery(db,
      `INSERT OR REPLACE INTO ai_config (key, value, updated_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [key, String(value), req.user.id]
    );

    logAudit(req.user.id, req.user.role, 'AI_CONFIG_CHANGED', 'AI_CONFIG', key,
      { key, value }, req);
    res.json({ message: 'AI config updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update AI config' });
  }
});

// ── Admin: Audit Logs ──
app.get('/api/admin/audit-logs', authenticate, isManagement, async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const db = await getDatabase();
    let sql = `SELECT a.*, u.full_name as user_name FROM audit_logs a
               LEFT JOIN users u ON a.user_id = u.id WHERE 1=1`;
    const params = [];

    if (action) { sql += ' AND a.action = ?'; params.push(action); }
    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const logs = queryAll(db, sql, params);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ── Admin: Analytics ──
app.get('/api/admin/analytics', authenticate, isManagement, async (req, res) => {
  try {
    const db = await getDatabase();
    const analytics = {};

    // Cases by category (aggregated)
    analytics.by_category = queryAll(db,
      "SELECT category, COUNT(*) as count FROM cases WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC"
    );

    // Cases by severity
    analytics.by_severity = queryAll(db,
      "SELECT severity, COUNT(*) as count FROM cases GROUP BY severity"
    );

    // Cases by status
    analytics.by_status = queryAll(db,
      "SELECT status, COUNT(*) as count FROM cases GROUP BY status"
    );

    // Cases by campus zone (heatmap data)
    analytics.by_zone = queryAll(db,
      "SELECT campus_zone, COUNT(*) as count FROM cases WHERE campus_zone IS NOT NULL GROUP BY campus_zone ORDER BY count DESC"
    );

    // Monthly trend
    analytics.monthly = queryAll(db,
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
       FROM cases GROUP BY month ORDER BY month DESC LIMIT 12`
    );

    // Average resolution time (simplified)
    const avgRes = queryOne(db,
      `SELECT AVG(julianday(resolved_at) - julianday(created_at)) * 24 as avg_hours
       FROM cases WHERE resolved_at IS NOT NULL`
    );
    analytics.avg_resolution_hours = avgRes ? Math.round(avgRes.avg_hours * 10) / 10 : null;

    res.json({ analytics });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ── Admin: Staff List ──
app.get('/api/admin/staff', authenticate, isStaff, async (req, res) => {
  try {
    const db = await getDatabase();
    const staff = queryAll(db,
      `SELECT id, full_name, email, role, department, is_active
       FROM users WHERE role NOT IN ('STUDENT') AND is_active = 1
       ORDER BY role, full_name`
    );
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// ── System Status ──
app.get('/api/system/status', async (req, res) => {
  const geminiConfigured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
  const mapsConfigured = !!(process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY.length > 10);

  res.json({
    status: 'online',
    version: '1.0.0',
    integrations: {
      ai: { configured: geminiConfigured, provider: geminiConfigured ? 'gemini' : 'rule-engine' },
      maps: { configured: mapsConfigured },
      sms: { configured: false },
      email: { configured: false }
    }
  });
});

// ── Fallback: Serve frontend pages ──
app.get('*', (req, res) => {
  // If API route, 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  // Try to serve the requested HTML page
  const pagePath = path.join(__dirname, '..', req.path.endsWith('.html') ? req.path : `${req.path}.html`);
  const fs = require('fs');
  if (fs.existsSync(pagePath)) {
    return res.sendFile(pagePath);
  }

  // Fallback to index
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ──
async function start() {
  try {
    await getDatabase();
    console.log('✓ Database initialized');

    // Start automated background jobs
    startEscalationEngine();

    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║         KAVACH CAMPUS SERVER             ║
║         Safety in One Tap.               ║
╠══════════════════════════════════════════╣
║  🌐 http://localhost:${PORT}               ║
║  📦 API: http://localhost:${PORT}/api       ║
║                                          ║
║  Security Note:                          ║
║  Ensure default admin password is        ║
║  changed on first login.                 ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
