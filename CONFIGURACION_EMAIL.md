# 📧 Configuración de Correo Electrónico - Taller Conecta

## Configuración para Mailtrap.io

### Paso 1: Crear cuenta en Mailtrap

1. Ve a [mailtrap.io](https://mailtrap.io) y crea una cuenta gratuita
2. Crea un nuevo "Inbox" (bandeja de entrada) para Taller Conecta
3. Ve a la sección **SMTP Settings** de tu inbox
4. Copia las credenciales:

```
Host: sandbox.smtp.mailtrap.io
Port: 2525 (o 587)
User: tu_usuario_mailtrap
Pass: tu_contraseña_mailtrap
```

### Paso 2: Configurar variables de entorno en Cloudflare

Ve a [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → TallerConecta → Settings → Variables y agrega:

| Variable | Valor ejemplo |
|----------|---------------|
| `SMTP_HOST` | `smtp.mailtrap.io` |
| `SMTP_PORT` | `2525` |
| `SMTP_USER` | `tu_usuario_mailtrap` |
| `SMTP_PASS` | `tu_contraseña_mailtrap` |
| `SMTP_FROM` | `Taller Conecta <no-reply@tallerconecta.co>` |

### Paso 3: Configurar SMTP Relay para Cloudflare Workers

⚠️ **IMPORTANTE:** Cloudflare Workers **NO permite conexiones TCP directas** a servidores SMTP (los puertos 25, 587, 465 están bloqueados). Para enviar correos reales necesitas un servidor SMTP relay con API HTTP.

#### Opción A: Usar un servidor SMTP relay con API HTTP

Puedes montar un servidor sencillo en cualquier proveedor (Railway, Render, Fly.io, etc.) que:

1. Reciba peticiones HTTP POST
2. Reenvíe el correo usando SMTP a Mailtrap

Ejemplo de servidor relay (Node.js/Express):

```javascript
// servidor-smtp-relay.js
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,      // smtp.mailtrap.io
  port: parseInt(process.env.SMTP_PORT), // 2525
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/send', async (req, res) => {
  const { from, to, subject, html, text, smtp } = req.body;
  
  // Si se proporciona smtp en el body, usarlo; si no, usar el del servidor
  const transport = smtp ? nodemailer.createTransport(smtp) : transporter;
  
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000);
```

Luego configura en Cloudflare Workers:
```
SMTP_API_URL=https://tu-relay-smtp.onrender.com/send
SMTP_API_KEY=bd8209a0f57ef7f759477473de89b79d
```

### Estructura de archivos modificados

| Archivo | Descripción |
|---------|-------------|
| `lib/email/service.ts` | Servicio de envío de correos con soporte para variables de entorno SMTP |
| `.env.example` | Ejemplo de configuración de variables de entorno |
| `app/api/auth/registro-con-codigo/route.ts` | Registro con verificación por correo |
| `app/api/auth/reset-password/verify/route.ts` | Restablecimiento de contraseña con verificación |
| `app/api/auth/verification/send/route.ts` | Envío de código de verificación |
| `app/api/auth/verification/verify/route.ts` | Verificación de código |

---

### Flujo de registro con verificación por correo

1. Usuario se registra en `/registro`
2. Sistema genera código de verificación de 6 dígitos
3. Sistema envía correo con el código vía SMTP
4. Usuario recibe el código en su correo
5. Usuario ingresa el código en la aplicación
6. Sistema valida el código y crea la cuenta con estado `email_verified = true`
7. Usuario puede iniciar sesión

---

### Solución de problemas

| Problema | Solución |
|----------|----------|
| No llegan los correos | Verifica que `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` estén configurados en Cloudflare Dashboard |
| Error 500 al enviar | Revisa los logs de Cloudflare Workers con `wrangler tail` |
| Código no llega | Verifica que el correo no esté en spam; en Mailtrap revisa la bandeja de entrada |
| Error 527 (Worker error) | Revisa los logs de Cloudflare Workers para ver el error detallado |

### Comandos útiles

```bash
# Ver logs del Worker en tiempo real
wrangler tail

# Ver variables de entorno configuradas
wrangler secret list --name tallerconecta

# Agregar variable de entorno
wrangler secret put SMTP_HOST --name tallerconecta

# Desplegar cambios
npm run build && npm run deploy
```
