const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');

function nextInvoiceNumber(db) {
  const last = db.prepare("SELECT number FROM invoices ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'CIA-0001';
  const num = parseInt(last.number.split('-')[1] || '0') + 1;
  return `CIA-${String(num).padStart(4, '0')}`;
}

// GET /api/invoices
router.get('/', verifyToken, (req, res) => {
  const db = req.app.locals.db;
  const { status, client_id } = req.query;
  let sql = `SELECT i.*, c.name AS client_name, u.name AS created_by_name FROM invoices i JOIN clients c ON i.client_id=c.id JOIN users u ON i.created_by=u.id`;
  const params = [];
  const where = [];
  if (status) { where.push('i.status=?'); params.push(status); }
  if (client_id) { where.push('i.client_id=?'); params.push(client_id); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY i.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/invoices/:id
router.get('/:id', verifyToken, (req, res) => {
  const db = req.app.locals.db;
  const inv = db.prepare(`SELECT i.*, c.name AS client_name, c.email AS client_email, c.phone AS client_phone, c.address AS client_address, c.cedula AS client_cedula, u.name AS created_by_name FROM invoices i JOIN clients c ON i.client_id=c.id JOIN users u ON i.created_by=u.id WHERE i.id=?`).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Factura no encontrada' });
  inv.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id=?').all(req.params.id);
  res.json(inv);
});

// POST /api/invoices
router.post('/', verifyToken, requireRole('admin', 'supervisor', 'vendedor', 'cajero'), (req, res) => {
  const { client_id, items = [], notes, tax = 13 } = req.body;
  const db = req.app.locals.db;
  if (!client_id || !items.length) return res.status(400).json({ error: 'Cliente e ítems requeridos' });
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const taxAmt = +(subtotal * tax / 100).toFixed(2);
  const total = +(subtotal + taxAmt).toFixed(2);
  const number = nextInvoiceNumber(db);
  const result = db.prepare('INSERT INTO invoices (number, client_id, created_by, subtotal, tax, total, notes) VALUES (?,?,?,?,?,?,?)').run(number, client_id, req.user.id, subtotal, taxAmt, total, notes);
  const invId = result.lastInsertRowid;
  const insertItem = db.prepare('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?,?,?,?,?)');
  for (const item of items) {
    insertItem.run(invId, item.description, item.quantity, item.unit_price, +(item.quantity * item.unit_price).toFixed(2));
  }
  res.status(201).json({ id: invId, number, total });
});

// PATCH /api/invoices/:id/status
router.patch('/:id/status', verifyToken, requireRole('admin', 'supervisor', 'cajero'), (req, res) => {
  const { status } = req.body;
  const valid = ['pendiente', 'pagada', 'anulada', 'vencida'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  const db = req.app.locals.db;
  const paidAt = status === 'pagada' ? new Date().toISOString() : null;
  db.prepare('UPDATE invoices SET status=?, paid_at=? WHERE id=?').run(status, paidAt, req.params.id);
  db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?,?,?,?)").run(req.user.id, `invoice_${status}`, 'invoices', req.params.id);
  res.json({ message: 'Estado actualizado' });
});

module.exports = router;
