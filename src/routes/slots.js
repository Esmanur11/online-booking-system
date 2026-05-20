// routes/slots.js — GET /api/slots
const router = require('express').Router();
const { pool } = require('../db');
const { authenticateUser } = require('../middleware/auth');
const { getAvailableSlots } = require('../services/AvailabilityService');

router.get('/', authenticateUser, async (req, res) => {
  const { serviceId, date } = req.query;
  if (!serviceId || !date)
    return res.status(400).json({ message: 'serviceId and date are required' });

  // Auto-generate slots for date if none exist
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) as count FROM timeslots WHERE serviceId=? AND date=?', [serviceId, date]
  );
  if (count === 0) {
    const times = [['09:00','10:00'],['10:00','11:00'],['11:00','12:00'],['14:00','15:00'],['15:00','16:00'],['16:00','17:00']];
    for (const [start, end] of times) {
      await pool.query('INSERT IGNORE INTO timeslots (serviceId, date, startTime, endTime) VALUES (?, ?, ?, ?)', [serviceId, date, start, end]);
    }
  }

  const slots = await getAvailableSlots(serviceId, date);
  res.json(slots);
});

module.exports = router;
