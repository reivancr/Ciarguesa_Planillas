const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/clients
router.get('/', verifyToken, (req, res) => {
  const { q } = req.query;
  const db = req.app.locals.db;
  let rows;
  if (q) {
    rows = db.prepare(`SELECT c.*, u.name AS created_by_name FROM clients c LEFT JOIN users u ON c.created_by=u.id WHERE c.active=1 AND (c.name LIKE ? OR c.email LIKE ? OR c.cedula LIKE ?) ORDER BY c.name`).all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare(`SELECT c.*, u.name AS created_by_name FROM clients c LEFT JOIN users u ON c.created_by=u.id WHERE c.active=1 ORDER BY c.name`).all();
  }
  res.json(rows);
});

// GET /api/clients/:id
router.get('/:id', verifyToken, (req, res) => {
  const db = req.app.locals.db;
  const client = db.prepare('SELECT * FROM clients WHERE id=? AND active=1').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  const invoices = db.prepare('SELECT id, number, total, status, created_at FROM invoices WHERE client_id=? ORDER BY created_at DESC LIMIT 10').all(req.params.id);
  res.json({ ...client, invoices });
});

// POST /api/clients
router.post('/', verifyToken, requireRole('admin', 'supervisor', 'vendedor'), (req, res) => {
  const { name, email, phone, address, cedula, notes } = req.body;
  const db = req.app.locals.db;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const result = db.prepare('INSERT INTO clients (name, email, phone, address, cedula, notes, created_by) VALUES (?,?,?,?,?,?,?)').run(name, email, phone, address, cedula, notes, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, name });
});

// PUT /api/clients/:id
router.put('/:id', verifyToken, requireRole('admin', 'supervisor', 'vendedor'), (req, res) => {
  const { name, email, phone, address, cedula, notes } = req.body;
  const db = req.app.locals.db;
  db.prepare('UPDATE clients SET name=?, email=?, phone=?, address=?, cedula=?, notes=? WHERE id=?').run(name, email, phone, address, cedula, notes, req.params.id);
  res.json({ message: 'Cliente actualizado' });
});

// DELETE /api/clients/:id
router.delete('/:id', verifyToken, requireRole('admin', 'supervisor'), (req, res) => {
  req.app.locals.db.prepare('UPDATE clients SET active=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Cliente eliminado' });
});

module.exports = router;
