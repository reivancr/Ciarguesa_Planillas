const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SECRET, verifyToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    SECRET, { expiresIn: '8h' }
  );
  db.prepare("INSERT INTO audit_log (user_id, action) VALUES (?,?)").run(user.id, 'login');
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  const db = req.app.locals.db;
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

// POST /api/auth/change-password
router.post('/change-password', verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Contraseña actual incorrecta' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.user.id);
  res.json({ message: 'Contraseña actualizada' });
});

module.exports = router;
