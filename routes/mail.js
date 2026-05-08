const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Endpoint para probar la conexión SMTP
router.post('/test', async (req, res) => {
  const { host, port, user, pass, secure } = req.body;

  if (!host || !port || !user || !pass) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros de configuración (Host, Puerto, Usuario o Contraseña)' });
  }

  // Lógica de seguridad: 
  // secure: true para el puerto 465 (SSL), false para otros (como 587 con STARTTLS)
  const isSecure = secure === 'ssl';

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: isSecure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  });

  try {
    console.log(`[SMTP TEST] Intentando conectar a ${host}:${port} (Secure: ${isSecure})`);
    await transporter.verify();
    res.json({ success: true, message: 'Conexión SMTP exitosa. El servidor está listo para enviar correos.' });
  } catch (error) {
    console.error('[SMTP TEST ERROR]:', error);
    let msg = error.message;
    if (error.code === 'EAUTH') msg = 'Error de autenticación: Usuario o contraseña incorrectos.';
    if (error.code === 'ESOCKET') msg = 'Error de red: No se pudo establecer conexión con el servidor SMTP.';
    if (error.code === 'ETIMEDOUT') msg = 'Tiempo de espera agotado al conectar al servidor.';

    res.status(500).json({ success: false, message: msg });
  }
});

// Endpoint para enviar una boleta
router.post('/send-boleta', async (req, res) => {
  const { smtp, to, subject, html, employeeName } = req.body;

  if (!smtp || !to || !html) {
    return res.status(400).json({ success: false, message: 'Datos insuficientes para el envío' });
  }

  const isSecure = smtp.secure === 'ssl';

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: parseInt(smtp.port),
    secure: isSecure,
    auth: { user: smtp.user, pass: smtp.pass },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  });

  const mailOptions = {
    from: `"${smtp.from || 'CIARGUESA'}" <${smtp.user}>`,
    to,
    subject: subject || `Boleta de Pago - ${employeeName || 'Empleado'}`,
    html: html
  };

  try {
    console.log(`[SMTP SEND] Enviando correo a ${to} via ${smtp.host}`);
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `Correo enviado exitosamente a ${to}` });
  } catch (error) {
    console.error('[SMTP SEND ERROR]:', error);
    res.status(500).json({ success: false, message: 'Error al enviar el correo: ' + error.message });
  }
});

module.exports = router;
