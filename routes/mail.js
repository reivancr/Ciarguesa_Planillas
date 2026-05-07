const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Endpoint para probar la conexión SMTP
router.post('/test', async (req, res) => {
  const { host, port, user, pass, secure } = req.body;

  if (!host || !port || !user || !pass) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros de configuración' });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: secure === 'ssl',
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    res.json({ success: true, message: 'Conexión exitosa' });
  } catch (error) {
    console.error('SMTP Test Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint para enviar una boleta
router.post('/send-boleta', async (req, res) => {
  const { smtp, to, subject, html, employeeName } = req.body;

  if (!smtp || !to || !html) {
    return res.status(400).json({ success: false, message: 'Datos insuficientes' });
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure === 'ssl',
    auth: { user: smtp.user, pass: smtp.pass },
    tls: { rejectUnauthorized: false }
  });

  const mailOptions = {
    from: `"${smtp.from || 'CIARGUESA'}" <${smtp.user}>`,
    to,
    subject: subject || `Boleta de Pago - ${employeeName || 'Empleado'}`,
    html: html
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `Correo enviado a ${to}` });
  } catch (error) {
    console.error('SMTP Send Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
