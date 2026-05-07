const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { verifyToken, requireRole } = require('../middleware/auth');

const ROLES = ['admin', 'supervisor', 'vendedor', 'cajero', 'reparador'];

// GET /api/users  — solo admin/supervisor
router.get('/', verifyToken, requireRole('admin', 'supervisor'), (req, res) => {
  const users = req.app.locals.db
    .prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY name')
    .all();
  res.json(users);
});

// POST /api/users  — solo admin
router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  const db = req.app.locals.db;
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return res.status(409).json({ error: 'El correo ya existe' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)').run(name, email, hash, role);
  db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?,?,?,?)").run(req.user.id, 'create_user', 'users', result.lastInsertRowid);
  res.status(201).json({ id: result.lastInsertRowid, name, email, role });
});

// PUT /api/users/:id  — solo admin
router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { name, email, role, active, password } = req.body;
  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const newHash = password ? bcrypt.hashSync(password, 10) : user.password;
  db.prepare('UPDATE users SET name=?, email=?, role=?, active=?, password=? WHERE id=?')
    .run(name ?? user.name, email ?? user.email, role ?? user.role, active ?? user.active, newHash, req.params.id);
  db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?,?,?,?)").run(req.user.id, 'update_user', 'users', req.params.id);
  res.json({ message: 'Usuario actualizado' });
});

// DELETE /api/users/:id (desactivar) — solo admin
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
  db.prepare('UPDATE users SET active=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Usuario desactivado' });
});

// GET /api/users/roles
router.get('/roles', verifyToken, (req, res) => res.json(ROLES));

module.exports = router;
