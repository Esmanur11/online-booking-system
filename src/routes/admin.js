// routes/admin.js — Admin only routes
const router = require('express').Router();
const { pool } = require('../db');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// GET /api/admin/bookings
router.get('/bookings', authenticateUser, requireAdmin, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT b.*, u.name as userName, u.email as userEmail,
           s.serviceName, s.price, t.startTime, t.endTime, t.date
    FROM bookings b
    JOIN users     u ON b.userId    = u.userId
    JOIN services  s ON b.serviceId = s.serviceId
    JOIN timeslots t ON b.slotId    = t.slotId
    ORDER BY b.bookingDate DESC
  `);
  res.json(rows);
});

// DELETE /api/admin/bookings/:id
router.delete('/bookings/:id', authenticateUser, requireAdmin, async (req, res) => {
  const { pool: db } = require('../db');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query('SELECT * FROM bookings WHERE bookingId = ?', [req.params.id]);
    if (!booking) { await conn.rollback(); return res.status(404).json({ message: 'Booking not found' }); }
    await conn.query('UPDATE bookings SET status = ? WHERE bookingId = ?', ['cancelled', req.params.id]);
    await conn.query('UPDATE timeslots SET status = ? WHERE slotId = ?',   ['available', booking.slotId]);
    await conn.commit();
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Server error' });
  } finally { conn.release(); }
});

// GET /api/admin/stats
router.get('/stats', authenticateUser, requireAdmin, async (req, res) => {
  const [[{ total }]]     = await pool.query("SELECT COUNT(*) as total FROM bookings");
  const [[{ confirmed }]] = await pool.query("SELECT COUNT(*) as confirmed FROM bookings WHERE status='confirmed'");
  const [[{ cancelled }]] = await pool.query("SELECT COUNT(*) as cancelled FROM bookings WHERE status='cancelled'");
  const [[{ revenue }]]   = await pool.query("SELECT COALESCE(SUM(s.price),0) as revenue FROM bookings b JOIN services s ON b.serviceId=s.serviceId WHERE b.status='confirmed'");
  res.json({ total, confirmed, cancelled, revenue });
});

module.exports = router;
