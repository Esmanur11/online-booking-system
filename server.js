// ─────────────────────────────────────────────────────────────
//  BookEasy — server.js (Entry Point)
//  Node.js + Express + MySQL
// ─────────────────────────────────────────────────────────────
//
//  SETUP:
//    npm install express mysql2 jsonwebtoken bcryptjs cors
//    node server.js
//
// ─────────────────────────────────────────────────────────────

const express = require('express');
const cors    = require('cors');
const app     = express();
const PORT    = 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',     require('./src/routes/auth'));
app.use('/api/services', require('./src/routes/services'));
app.use('/api/slots',    require('./src/routes/slots'));
app.use('/api/bookings', require('./src/routes/bookings'));
app.use('/api/admin',    require('./src/routes/admin'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const { setupDatabase } = require('./src/db');
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
