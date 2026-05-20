// ─────────────────────────────────────────────────────────────
//  db.js — MySQL Connection Pool + Database Setup
// ─────────────────────────────────────────────────────────────
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: '',
  database: 'booking_db',
  waitForConnections: true,
  connectionLimit: 10,
});

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

    // Seed data
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

module.exports = { pool, setupDatabase };
