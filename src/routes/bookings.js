// routes/bookings.js — POST, GET, DELETE /api/bookings
const router = require('express').Router();
const { authenticateUser } = require('../middleware/auth');
const { createBooking, cancelBooking, getUserBookings } = require('../services/BookingService');

// POST /api/bookings — Create booking (double-booking prevention via transaction)
router.post('/', authenticateUser, async (req, res) => {
  const { serviceId, slotId } = req.body;
  if (!serviceId || !slotId)
    return res.status(400).json({ message: 'Missing fields.' });
  try {
    const result = await createBooking(req.user.userId, serviceId, slotId);
    res.status(201).json({ message: 'Booking created.', bookingId: result.bookingId });
  } catch (err) {
    const status = err.code || 500;
    res.status(status).json({ message: err.message || 'Server error.' });
  }
});

// GET /api/bookings/mine — User's own bookings
router.get('/mine', authenticateUser, async (req, res) => {
  try {
    const bookings = await getUserBookings(req.user.userId);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/bookings/:id — Cancel booking
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    await cancelBooking(req.params.id, req.user.userId);
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    const status = err.code || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
