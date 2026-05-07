require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// ─── Base de datos SQLite ─────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db', 'ciarguesa.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema inicial ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'vendedor',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT,
    phone       TEXT,
    address     TEXT,
    cedula      TEXT    UNIQUE,
    notes       TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by  INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    number       TEXT    NOT NULL UNIQUE,
    client_id    INTEGER NOT NULL REFERENCES clients(id),
    created_by   INTEGER NOT NULL REFERENCES users(id),
    status       TEXT    NOT NULL DEFAULT 'pendiente',
    subtotal     REAL    NOT NULL DEFAULT 0,
    tax          REAL    NOT NULL DEFAULT 0,
    total        REAL    NOT NULL DEFAULT 0,
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    paid_at      TEXT
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id   INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description  TEXT    NOT NULL,
    quantity     REAL    NOT NULL DEFAULT 1,
    unit_price   REAL    NOT NULL DEFAULT 0,
    total        REAL    NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS work_orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    client_id    INTEGER REFERENCES clients(id),
    assigned_to  INTEGER REFERENCES users(id),
    created_by   INTEGER REFERENCES users(id),
    status       TEXT    NOT NULL DEFAULT 'pendiente',
    priority     TEXT    NOT NULL DEFAULT 'media',
    description  TEXT,
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    action     TEXT    NOT NULL,
    entity     TEXT,
    entity_id  INTEGER,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Crear admin por defecto si no existe ─────────────────────
const adminExists = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
if (!adminExists) {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@2025!', 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)").run(
    'Administrador',
    process.env.ADMIN_EMAIL || 'admin@ciarguesa.com',
    hash,
    'admin'
  );
  console.log('✅ Usuario admin creado: admin@ciarguesa.com / Admin@2025!');
}

// ─── Exponer db a rutas ────────────────────────────────────────
app.locals.db = db;

// ─── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/clients',     require('./routes/clients'));
app.use('/api/invoices',    require('./routes/invoices'));
app.use('/api/work-orders', require('./routes/work_orders'));
app.use('/api/mail',        require('./routes/mail'));

// ─── Dashboard stats ───────────────────────────────────────────
const { verifyToken } = require('./middleware/auth');
app.get('/api/dashboard', verifyToken, (req, res) => {
  const stats = {
    totalClients:    db.prepare("SELECT COUNT(*) AS c FROM clients WHERE active=1").get().c,
    totalInvoices:   db.prepare("SELECT COUNT(*) AS c FROM invoices").get().c,
    pendingInvoices: db.prepare("SELECT COUNT(*) AS c FROM invoices WHERE status='pendiente'").get().c,
    revenueMonth:    db.prepare(`SELECT COALESCE(SUM(total),0) AS s FROM invoices WHERE status='pagada' AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')`).get().s,
    openOrders:      db.prepare("SELECT COUNT(*) AS c FROM work_orders WHERE status NOT IN ('completado','cancelado')").get().c,
    usersActive:     db.prepare("SELECT COUNT(*) AS c FROM users WHERE active=1").get().c,
    recentInvoices:  db.prepare(`SELECT i.id, i.number, c.name AS client, i.total, i.status, i.created_at FROM invoices i JOIN clients c ON i.client_id=c.id ORDER BY i.created_at DESC LIMIT 5`).all(),
    recentOrders:    db.prepare(`SELECT wo.id, wo.title, wo.status, wo.priority, u.name AS assigned FROM work_orders wo LEFT JOIN users u ON wo.assigned_to=u.id ORDER BY wo.created_at DESC LIMIT 5`).all(),
  };
  res.json(stats);
});

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

app.listen(PORT, () => console.log(`🚀 Ciarguesa API corriendo en puerto ${PORT}`));
