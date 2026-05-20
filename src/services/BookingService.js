// ─────────────────────────────────────────────────────────────
//  services/BookingService.js
//  Business Logic — Booking Creation & Cancellation
// ─────────────────────────────────────────────────────────────
const { pool } = require('../db');

async function createBooking(userId, serviceId, slotId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // SELECT FOR UPDATE — row-level lock prevents double booking
    const [[slot]] = await conn.query(
      'SELECT * FROM timeslots WHERE slotId = ? FOR UPDATE', [slotId]
    );
    if (!slot)                  throw { code: 404, message: 'Time slot not found.' };
    if (slot.status === 'booked') throw { code: 409, message: 'Slot already booked.' };

    const [result] = await conn.query(
      'INSERT INTO bookings (userId, serviceId, slotId, status) VALUES (?, ?, ?, ?)',
      [userId, serviceId, slotId, 'confirmed']
    );
    await conn.query(
      'UPDATE timeslots SET status = ? WHERE slotId = ?', ['booked', slotId]
    );
    await conn.commit();
    return { bookingId: result.insertId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function cancelBooking(bookingId, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query(
      'SELECT * FROM bookings WHERE bookingId = ? AND userId = ?', [bookingId, userId]
    );
    if (!booking) throw { code: 404, message: 'Booking not found.' };

    await conn.query('UPDATE bookings SET status = ? WHERE bookingId = ?', ['cancelled', bookingId]);
    await conn.query('UPDATE timeslots SET status = ? WHERE slotId = ?',   ['available', booking.slotId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getUserBookings(userId) {
  const [rows] = await pool.query(`
    SELECT b.*, s.serviceName, s.price, t.startTime, t.endTime, t.date
    FROM bookings b
    JOIN services  s ON b.serviceId = s.serviceId
    JOIN timeslots t ON b.slotId    = t.slotId
    WHERE b.userId = ?
    ORDER BY b.bookingDate DESC
  `, [userId]);
  return rows;
}

module.exports = { createBooking, cancelBooking, getUserBookings };
