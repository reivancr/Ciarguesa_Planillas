require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Rutas ────────────────────────────────────────────────────
// Importamos solo la ruta de correo que es la necesaria para las boletas
app.use('/api/mail', require('./routes/mail'));

// ─── Servir Archivos Estáticos ───────────────────────────────
// Esto permite que el backend también sirva la página web
app.use(express.static(path.join(__dirname, 'public')));

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date(), system: 'Ciarguesa Payroll' }));

app.listen(PORT, () => {
    console.log(`🚀 Servidor Ciarguesa Payroll iniciado`);
    console.log(`📍 Backend: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
