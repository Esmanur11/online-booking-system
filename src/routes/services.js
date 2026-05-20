const router = require('express').Router();
const { pool } = require('../db');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const [services] = await pool.query('SELECT * FROM services WHERE isActive = 1');
  res.json(services);
});

router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  const { serviceName, description, duration, price } = req.body;
  await pool.query(
    'UPDATE services SET serviceName=?, description=?, duration=?, price=? WHERE serviceId=?',
    [serviceName, description, duration, price, req.params.id]
  );
  res.json({ message: 'Service updated' });
});

module.exports = router;
