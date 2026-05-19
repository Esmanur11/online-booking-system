// ─────────────────────────────────────────────────────────────
//  BookEasy — Backend Server (MySQL Version)
//  Node.js + Express + MySQL (mysql2)
//  JWT Authentication + Double-Booking Prevention
// ─────────────────────────────────────────────────────────────

const express = require('express');
const mysql   = require('mysql2/promise');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const cors    = require('cors');

const app        = express();
const JWT_SECRET = 'bookeasy_jwt_secret_2026';
const PORT       = 3001;

app.use(cors());
app.use(express.json());

// ── Database Connection Pool ───────────────────────────────────
const pool = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: '',
  database: 'booking_db',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── Database Setup ─────────────────────────────────────────────
async function setupDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        userId    INT AUTO_INCREMENT PRIMARY KEY,
        name      VARCHAR(100) NOT NULL,
        email     VARCHAR(150) NOT NULL UNIQUE,
        password  VARCHAR(255) NOT NULL,
        role      ENUM('user','admin') DEFAULT 'user',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS services (
        serviceId   INT AUTO_INCREMENT PRIMARY KEY,
        serviceName VARCHAR(100) NOT NULL,
        description TEXT,
        duration    INT NOT NULL,
        price       DECIMAL(10,2) NOT NULL,
        isActive    BOOLEAN DEFAULT TRUE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS timeslots (
        slotId    INT AUTO_INCREMENT PRIMARY KEY,
        serviceId INT NOT NULL,
        date      DATE NOT NULL,
        startTime TIME NOT NULL,
        endTime   TIME NOT NULL,
        status    ENUM('available','booked','cancelled') DEFAULT 'available',
        FOREIGN KEY (serviceId) REFERENCES services(serviceId) ON DELETE CASCADE,
        UNIQUE KEY uq_slot (serviceId, date, startTime)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        bookingId   INT AUTO_INCREMENT PRIMARY KEY,
        userId      INT NOT NULL,
        serviceId   INT NOT NULL,
        slotId      INT NOT NULL,
        status      ENUM('confirmed','cancelled') DEFAULT 'confirmed',
        bookingDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId)    REFERENCES users(userId),
        FOREIGN KEY (serviceId) REFERENCES services(serviceId),
        FOREIGN KEY (slotId)    REFERENCES timeslots(slotId)
      )
    `);

    const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM services');
    if (count === 0) {
      await conn.query(`
        INSERT INTO services (serviceName, description, duration, price) VALUES
        ('Hair & Styling',     'Professional cuts, coloring and styling.',    60, 45.00),
        ('Massage Therapy',    'Deep-tissue and relaxation massages.',         90, 80.00),
        ('Dental Checkup',     'Full oral exam and cleaning.',                45, 120.00),
        ('Personal Training',  'One-on-one fitness coaching session.',        60, 60.00),
        ('Legal Consultation', '30-min legal advice session.',                30, 150.00)
      `);
      const hash = bcrypt.hashSync('admin123', 12);
      await conn.query(
        'INSERT IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin', 'admin@bookeasy.com', hash, 'admin']
      );
      const today    = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const times    = [['09:00','10:00'],['10:00','11:00'],['11:00','12:00'],['14:00','15:00'],['15:00','16:00'],['16:00','17:00']];
      const [allServices] = await conn.query('SELECT serviceId FROM services');
      for (const svc of allServices) {
        for (const date of [today, tomorrow]) {
          for (const [start, end] of times) {
            await conn.query('INSERT IGNORE INTO timeslots (serviceId, date, startTime, endTime) VALUES (?, ?, ?, ?)', [svc.serviceId, date, start, end]);
          }
        }
      }
    }
    console.log('✅ Database setup complete');
  } finally {
    conn.release();
  }
}

// ── Auth Middleware ────────────────────────────────────────────
function authenticateUser(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'No token provided' });
  const token = auth.split(' ')[1];
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ message: 'Invalid token' }); }
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
}

// ── AUTH ROUTES ────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required' });
  if (password.length < 4) return res.status(400).json({ message: 'Password must be at least 4 characters' });
  try {
    const [[existing]] = await pool.query('SELECT userId FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 12);
    const [result] = await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, 'user']);
    const token = jwt.sign({ userId: result.insertId, email, name, role: 'user' }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, user: { userId: result.insertId, name, email, role: 'user' } });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.userId, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { userId: user.userId, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

// ── SERVICES ROUTES ────────────────────────────────────────────
app.get('/api/services', async (req, res) => {
  const [services] = await pool.query('SELECT * FROM services WHERE isActive = 1');
  res.json(services);
});

app.put('/api/services/:id', authenticateUser, requireAdmin, async (req, res) => {
  const { serviceName, description, duration, price } = req.body;
  await pool.query('UPDATE services SET serviceName=?, description=?, duration=?, price=? WHERE serviceId=?', [serviceName, description, duration, price, req.params.id]);
  res.json({ message: 'Service updated' });
});

// ── SLOTS ROUTES ───────────────────────────────────────────────
app.get('/api/slots', authenticateUser, async (req, res) => {
  const { serviceId, date } = req.query;
  if (!serviceId || !date) return res.status(400).json({ message: 'serviceId and date are required' });
  const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM timeslots WHERE serviceId=? AND date=?', [serviceId, date]);
  if (count === 0) {
    const times = [['09:00','10:00'],['10:00','11:00'],['11:00','12:00'],['14:00','15:00'],['15:00','16:00'],['16:00','17:00']];
    for (const [start, end] of times) {
      await pool.query('INSERT IGNORE INTO timeslots (serviceId, date, startTime, endTime) VALUES (?, ?, ?, ?)', [serviceId, date, start, end]);
    }
  }
  const [slots] = await pool.query('SELECT * FROM timeslots WHERE serviceId=? AND date=? ORDER BY startTime', [serviceId, date]);
  res.json(slots);
});

// ── BOOKINGS ROUTES ────────────────────────────────────────────
app.post('/api/bookings', authenticateUser, async (req, res) => {
  const { serviceId, slotId } = req.body;
  const userId = req.user.userId;
  if (!serviceId || !slotId) return res.status(400).json({ message: 'Missing fields.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[slot]] = await conn.query('SELECT * FROM timeslots WHERE slotId = ? FOR UPDATE', [slotId]);
    if (!slot) { await conn.rollback(); return res.status(404).json({ message: 'Time slot not found.' }); }
    if (slot.status === 'booked') { await conn.rollback(); return res.status(409).json({ message: 'Slot already booked.' }); }
    const [result] = await conn.query('INSERT INTO bookings (userId, serviceId, slotId, status) VALUES (?, ?, ?, ?)', [userId, serviceId, slotId, 'confirmed']);
    await conn.query('UPDATE timeslots SET status = ? WHERE slotId = ?', ['booked', slotId]);
    await conn.commit();
    res.status(201).json({ message: 'Booking created.', bookingId: result.insertId });
  } catch (err) { await conn.rollback(); res.status(500).json({ message: 'Server error.', error: err.message }); }
  finally { conn.release(); }
});

app.get('/api/bookings/mine', authenticateUser, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT b.*, s.serviceName, s.price, t.startTime, t.endTime, t.date
    FROM bookings b
    JOIN services  s ON b.serviceId = s.serviceId
    JOIN timeslots t ON b.slotId    = t.slotId
    WHERE b.userId = ? ORDER BY b.bookingDate DESC
  `, [req.user.userId]);
  res.json(rows);
});

app.delete('/api/bookings/:id', authenticateUser, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query('SELECT * FROM bookings WHERE bookingId = ? AND userId = ?', [req.params.id, req.user.userId]);
    if (!booking) { await conn.rollback(); return res.status(404).json({ message: 'Booking not found' }); }
    await conn.query('UPDATE bookings SET status = ? WHERE bookingId = ?', ['cancelled', req.params.id]);
    await conn.query('UPDATE timeslots SET status = ? WHERE slotId = ?', ['available', booking.slotId]);
    await conn.commit();
    res.json({ message: 'Booking cancelled' });
  } catch (err) { await conn.rollback(); res.status(500).json({ message: 'Server error' }); }
  finally { conn.release(); }
});

// ── ADMIN ROUTES ───────────────────────────────────────────────
app.get('/api/admin/bookings', authenticateUser, requireAdmin, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT b.*, u.name as userName, u.email as userEmail, s.serviceName, s.price, t.startTime, t.endTime, t.date
    FROM bookings b
    JOIN users u ON b.userId=u.userId JOIN services s ON b.serviceId=s.serviceId JOIN timeslots t ON b.slotId=t.slotId
    ORDER BY b.bookingDate DESC
  `);
  res.json(rows);
});

app.delete('/api/admin/bookings/:id', authenticateUser, requireAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query('SELECT * FROM bookings WHERE bookingId = ?', [req.params.id]);
    if (!booking) { await conn.rollback(); return res.status(404).json({ message: 'Booking not found' }); }
    await conn.query('UPDATE bookings SET status = ? WHERE bookingId = ?', ['cancelled', req.params.id]);
    await conn.query('UPDATE timeslots SET status = ? WHERE slotId = ?', ['available', booking.slotId]);
    await conn.commit();
    res.json({ message: 'Booking cancelled' });
  } catch (err) { await conn.rollback(); res.status(500).json({ message: 'Server error' }); }
  finally { conn.release(); }
});

app.get('/api/admin/stats', authenticateUser, requireAdmin, async (req, res) => {
  const [[{ total }]]     = await pool.query("SELECT COUNT(*) as total FROM bookings");
  const [[{ confirmed }]] = await pool.query("SELECT COUNT(*) as confirmed FROM bookings WHERE status='confirmed'");
  const [[{ cancelled }]] = await pool.query("SELECT COUNT(*) as cancelled FROM bookings WHERE status='cancelled'");
  const [[{ revenue }]]   = await pool.query("SELECT COALESCE(SUM(s.price),0) as revenue FROM bookings b JOIN services s ON b.serviceId=s.serviceId WHERE b.status='confirmed'");
  res.json({ total, confirmed, cancelled, revenue });
});

// ── Start Server ───────────────────────────────────────────────
setupDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✅ BookEasy backend (MySQL) running on http://localhost:${PORT}`);
    console.log(`   Admin login: admin@bookeasy.com / admin123`);
    console.log(`   Press Ctrl+C to stop\n`);
  });
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
