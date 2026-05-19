// ─────────────────────────────────────────────────────────────
//  BookEasy — Backend Server
//  Node.js + Express + SQLite (no MySQL install needed)
//  JWT Authentication + Double-Booking Prevention
// ─────────────────────────────────────────────────────────────
//
//  SETUP:
//    npm install express better-sqlite3 jsonwebtoken bcryptjs cors
//    node server.js
//
//  API runs on http://localhost:3001
// ─────────────────────────────────────────────────────────────

const express  = require('express');
const Database = require('better-sqlite3');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const cors     = require('cors');
const path     = require('path');

const app       = express();
const JWT_SECRET = 'bookeasy_jwt_secret_2026';
const PORT      = 3001;

app.use(cors());
app.use(express.json());

// ── Database Setup ─────────────────────────────────────────────
const db = new Database('./bookeasy.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId    INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL UNIQUE,
    password  TEXT NOT NULL,
    role      TEXT DEFAULT 'user',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    serviceId   INTEGER PRIMARY KEY AUTOINCREMENT,
    serviceName TEXT NOT NULL,
    description TEXT,
    duration    INTEGER NOT NULL,
    price       REAL NOT NULL,
    isActive    INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS timeslots (
    slotId    INTEGER PRIMARY KEY AUTOINCREMENT,
    serviceId INTEGER NOT NULL,
    date      TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime   TEXT NOT NULL,
    status    TEXT DEFAULT 'available',
    FOREIGN KEY (serviceId) REFERENCES services(serviceId),
    UNIQUE(serviceId, date, startTime)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    bookingId   INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL,
    serviceId   INTEGER NOT NULL,
    slotId      INTEGER NOT NULL,
    status      TEXT DEFAULT 'confirmed',
    bookingDate TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId)    REFERENCES users(userId),
    FOREIGN KEY (serviceId) REFERENCES services(serviceId),
    FOREIGN KEY (slotId)    REFERENCES timeslots(slotId)
  );
`);

// ── Seed Data ──────────────────────────────────────────────────
const serviceCount = db.prepare('SELECT COUNT(*) as c FROM services').get().c;
if (serviceCount === 0) {
  const insertService = db.prepare(
    'INSERT INTO services (serviceName, description, duration, price) VALUES (?, ?, ?, ?)'
  );
  insertService.run('Hair & Styling',     'Professional cuts, coloring and styling.',    60, 45.00);
  insertService.run('Massage Therapy',    'Deep-tissue and relaxation massages.',         90, 80.00);
  insertService.run('Dental Checkup',     'Full oral exam and cleaning.',                45, 120.00);
  insertService.run('Personal Training',  'One-on-one fitness coaching session.',        60, 60.00);
  insertService.run('Legal Consultation', '30-min legal advice session.',                30, 150.00);

  // Seed admin user
  const hash = bcrypt.hashSync('admin123', 12);
  db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Admin', 'admin@bookeasy.com', hash, 'admin'
  );

  // Seed some time slots for today and tomorrow
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const times    = [
    ['09:00', '10:00'], ['10:00', '11:00'], ['11:00', '12:00'],
    ['14:00', '15:00'], ['15:00', '16:00'], ['16:00', '17:00']
  ];
  const insertSlot = db.prepare(
    'INSERT OR IGNORE INTO timeslots (serviceId, date, startTime, endTime) VALUES (?, ?, ?, ?)'
  );
  for (let svcId = 1; svcId <= 5; svcId++) {
    for (const [start, end] of times) {
      insertSlot.run(svcId, today, start, end);
      insertSlot.run(svcId, tomorrow, start, end);
    }
  }
}

// ── Auth Middleware ────────────────────────────────────────────
function authenticateUser(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'No token provided' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
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

// ── AUTH ROUTES ────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });
  if (password.length < 4)
    return res.status(400).json({ message: 'Password must be at least 4 characters' });

  try {
    const existing = db.prepare('SELECT userId FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hash   = bcrypt.hashSync(password, 12);
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hash, 'user');

    const token = jwt.sign(
      { userId: result.lastInsertRowid, email, name, role: 'user' },
      JWT_SECRET, { expiresIn: '8h' }
    );
    res.status(201).json({ token, user: { userId: result.lastInsertRowid, name, email, role: 'user' } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.userId, email: user.email, name: user.name, role: user.role },
    JWT_SECRET, { expiresIn: '8h' }
  );
  res.json({ token, user: { userId: user.userId, name: user.name, email: user.email, role: user.role } });
});

// ── SERVICES ROUTES ────────────────────────────────────────────

// GET /api/services
app.get('/api/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services WHERE isActive = 1').all();
  res.json(services);
});

// PUT /api/services/:id (Admin only)
app.put('/api/services/:id', authenticateUser, requireAdmin, (req, res) => {
  const { serviceName, description, duration, price } = req.body;
  db.prepare(
    'UPDATE services SET serviceName=?, description=?, duration=?, price=? WHERE serviceId=?'
  ).run(serviceName, description, duration, price, req.params.id);
  res.json({ message: 'Service updated' });
});

// ── SLOTS ROUTES ───────────────────────────────────────────────

// GET /api/slots?serviceId=1&date=2026-05-19
app.get('/api/slots', authenticateUser, (req, res) => {
  const { serviceId, date } = req.query;
  if (!serviceId || !date)
    return res.status(400).json({ message: 'serviceId and date are required' });

  // Auto-generate slots for requested date if none exist
  const existing = db.prepare(
    'SELECT COUNT(*) as c FROM timeslots WHERE serviceId=? AND date=?'
  ).get(serviceId, date);

  if (existing.c === 0) {
    const times = [
      ['09:00','10:00'],['10:00','11:00'],['11:00','12:00'],
      ['14:00','15:00'],['15:00','16:00'],['16:00','17:00']
    ];
    const insertSlot = db.prepare(
      'INSERT OR IGNORE INTO timeslots (serviceId, date, startTime, endTime) VALUES (?, ?, ?, ?)'
    );
    for (const [start, end] of times) {
      insertSlot.run(serviceId, date, start, end);
    }
  }

  const slots = db.prepare(
    'SELECT * FROM timeslots WHERE serviceId=? AND date=? ORDER BY startTime'
  ).all(serviceId, date);
  res.json(slots);
});

// ── BOOKINGS ROUTES ────────────────────────────────────────────

// POST /api/bookings — Create booking with double-booking prevention
app.post('/api/bookings', authenticateUser, (req, res) => {
  const { serviceId, slotId } = req.body;
  const userId = req.user.userId;

  if (!serviceId || !slotId)
    return res.status(400).json({ message: 'Missing fields.' });

  // AvailabilityService.checkAvailability(slotId)
  const slot = db.prepare('SELECT * FROM timeslots WHERE slotId = ?').get(slotId);

  if (!slot)
    return res.status(404).json({ message: 'Time slot not found.' });

  if (slot.status === 'booked')
    return res.status(409).json({ message: 'Slot already booked.' });

  // Save booking (transaction — double-booking prevention)
  const createBooking = db.transaction(() => {
    // Re-check inside transaction to prevent race conditions
    const freshSlot = db.prepare('SELECT * FROM timeslots WHERE slotId = ?').get(slotId);
    if (freshSlot.status === 'booked') {
      throw new Error('SLOT_TAKEN');
    }

    const result = db.prepare(
      'INSERT INTO bookings (userId, serviceId, slotId, status) VALUES (?, ?, ?, ?)'
    ).run(userId, serviceId, slotId, 'confirmed');

    db.prepare(
      'UPDATE timeslots SET status = ? WHERE slotId = ?'
    ).run('booked', slotId);

    return result.lastInsertRowid;
  });

  try {
    const bookingId = createBooking();
    res.status(201).json({ message: 'Booking created.', bookingId });
  } catch (err) {
    if (err.message === 'SLOT_TAKEN')
      return res.status(409).json({ message: 'Slot already booked.' });
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/bookings/mine — User's own bookings
app.get('/api/bookings/mine', authenticateUser, (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, s.serviceName, s.price, t.startTime, t.endTime, t.date
    FROM bookings b
    JOIN services  s ON b.serviceId = s.serviceId
    JOIN timeslots t ON b.slotId    = t.slotId
    WHERE b.userId = ?
    ORDER BY b.bookingDate DESC
  `).all(req.user.userId);
  res.json(rows);
});

// DELETE /api/bookings/:id — Cancel booking
app.delete('/api/bookings/:id', authenticateUser, (req, res) => {
  const cancelBooking = db.transaction(() => {
    const booking = db.prepare(
      'SELECT * FROM bookings WHERE bookingId = ? AND userId = ?'
    ).get(req.params.id, req.user.userId);

    if (!booking) throw new Error('NOT_FOUND');

    db.prepare('UPDATE bookings SET status = ? WHERE bookingId = ?')
      .run('cancelled', req.params.id);
    db.prepare('UPDATE timeslots SET status = ? WHERE slotId = ?')
      .run('available', booking.slotId);
  });

  try {
    cancelBooking();
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    if (err.message === 'NOT_FOUND')
      return res.status(404).json({ message: 'Booking not found' });
    res.status(500).json({ message: 'Server error' });
  }
});

// ── ADMIN ROUTES ───────────────────────────────────────────────

// GET /api/admin/bookings — All bookings
app.get('/api/admin/bookings', authenticateUser, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, u.name as userName, u.email as userEmail,
           s.serviceName, s.price, t.startTime, t.endTime, t.date
    FROM bookings b
    JOIN users     u ON b.userId    = u.userId
    JOIN services  s ON b.serviceId = s.serviceId
    JOIN timeslots t ON b.slotId    = t.slotId
    ORDER BY b.bookingDate DESC
  `).all();
  res.json(rows);
});

// DELETE /api/admin/bookings/:id — Admin cancel any booking
app.delete('/api/admin/bookings/:id', authenticateUser, requireAdmin, (req, res) => {
  const cancelBooking = db.transaction(() => {
    const booking = db.prepare('SELECT * FROM bookings WHERE bookingId = ?').get(req.params.id);
    if (!booking) throw new Error('NOT_FOUND');
    db.prepare('UPDATE bookings SET status = ? WHERE bookingId = ?')
      .run('cancelled', req.params.id);
    db.prepare('UPDATE timeslots SET status = ? WHERE slotId = ?')
      .run('available', booking.slotId);
  });

  try {
    cancelBooking();
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    if (err.message === 'NOT_FOUND')
      return res.status(404).json({ message: 'Booking not found' });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/stats
app.get('/api/admin/stats', authenticateUser, requireAdmin, (req, res) => {
  const total     = db.prepare("SELECT COUNT(*) as c FROM bookings").get().c;
  const confirmed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='confirmed'").get().c;
  const cancelled = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='cancelled'").get().c;
  const revenue   = db.prepare(`
    SELECT COALESCE(SUM(s.price), 0) as total
    FROM bookings b JOIN services s ON b.serviceId = s.serviceId
    WHERE b.status = 'confirmed'
  `).get().total;
  res.json({ total, confirmed, cancelled, revenue });
});

// ── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ BookEasy backend running on http://localhost:${PORT}`);
  console.log(`   Admin login: admin@bookeasy.com / admin123`);
  console.log(`   Press Ctrl+C to stop\n`);
});
