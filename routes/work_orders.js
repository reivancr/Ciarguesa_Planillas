const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/work-orders
router.get('/', verifyToken, (req, res) => {
  const db = req.app.locals.db;
  const { status, assigned_to } = req.query;
  let sql = `SELECT wo.*, c.name AS client_name, u.name AS assigned_name, cb.name AS created_by_name FROM work_orders wo LEFT JOIN clients c ON wo.client_id=c.id LEFT JOIN users u ON wo.assigned_to=u.id LEFT JOIN users cb ON wo.created_by=cb.id`;
  const params = [];
  const where = [];
  // Reparadores solo ven sus propias órdenes
  if (req.user.role === 'reparador') { where.push('wo.assigned_to=?'); params.push(req.user.id); }
  if (status) { where.push('wo.status=?'); params.push(status); }
  if (assigned_to && req.user.role !== 'reparador') { where.push('wo.assigned_to=?'); params.push(assigned_to); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY wo.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/work-orders/:id
router.get('/:id', verifyToken, (req, res) => {
  const db = req.app.locals.db;
  const wo = db.prepare(`SELECT wo.*, c.name AS client_name, u.name AS assigned_name FROM work_orders wo LEFT JOIN clients c ON wo.client_id=c.id LEFT JOIN users u ON wo.assigned_to=u.id WHERE wo.id=?`).get(req.params.id);
  if (!wo) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json(wo);
});

// POST /api/work-orders
router.post('/', verifyToken, requireRole('admin', 'supervisor', 'vendedor'), (req, res) => {
  const { title, client_id, assigned_to, priority, description } = req.body;
  const db = req.app.locals.db;
  if (!title) return res.status(400).json({ error: 'Título requerido' });
  const result = db.prepare('INSERT INTO work_orders (title, client_id, assigned_to, created_by, priority, description) VALUES (?,?,?,?,?,?)').run(title, client_id, assigned_to, req.user.id, priority || 'media', description);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH /api/work-orders/:id
router.patch('/:id', verifyToken, (req, res) => {
  const db = req.app.locals.db;
  const wo = db.prepare('SELECT * FROM work_orders WHERE id=?').get(req.params.id);
  if (!wo) return res.status(404).json({ error: 'Orden no encontrada' });
  // Reparadores solo pueden actualizar status y notes
  const { status, notes, title, client_id, assigned_to, priority, description } = req.body;
  const completedAt = status === 'completado' ? new Date().toISOString() : wo.completed_at;
  if (req.user.role === 'reparador') {
    db.prepare('UPDATE work_orders SET status=?, notes=?, updated_at=datetime("now"), completed_at=? WHERE id=?').run(status ?? wo.status, notes ?? wo.notes, completedAt, req.params.id);
  } else {
    db.prepare('UPDATE work_orders SET title=?, client_id=?, assigned_to=?, status=?, priority=?, description=?, notes=?, updated_at=datetime("now"), completed_at=? WHERE id=?').run(title ?? wo.title, client_id ?? wo.client_id, assigned_to ?? wo.assigned_to, status ?? wo.status, priority ?? wo.priority, description ?? wo.description, notes ?? wo.notes, completedAt, req.params.id);
  }
  res.json({ message: 'Orden actualizada' });
});

// DELETE /api/work-orders/:id
router.delete('/:id', verifyToken, requireRole('admin', 'supervisor'), (req, res) => {
  db.prepare("UPDATE work_orders SET status='cancelado' WHERE id=?").run(req.params.id);
  res.json({ message: 'Orden cancelada' });
});

module.exports = router;
