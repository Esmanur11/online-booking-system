// ─────────────────────────────────────────────────────────────
//  services/AvailabilityService.js
//  Business Logic — Availability Check & Double-Booking Prevention
// ─────────────────────────────────────────────────────────────
const { pool } = require('../db');

async function checkAvailability(slotId) {
  try {
    const [[slot]] = await pool.query(
      'SELECT * FROM timeslots WHERE slotId = ?', [slotId]
    );
    if (!slot)             return { available: false, message: 'Time slot not found.' };
    if (slot.status === 'booked') return { available: false, message: 'Slot already booked.' };
    return { available: true, slot };
  } catch (err) {
    return { available: false, message: 'System error during availability check.' };
  }
}

async function getAvailableSlots(serviceId, date) {
  const [rows] = await pool.query(
    `SELECT * FROM timeslots
     WHERE serviceId = ? AND date = ?
     ORDER BY startTime`,
    [serviceId, date]
  );
  return rows;
}

module.exports = { checkAvailability, getAvailableSlots };
