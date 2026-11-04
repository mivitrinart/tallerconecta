# ============================================================================
# CONFIGURACIÓN DE VARIABLES DE ENTORNO SMTP PARA TALLER CONECTA
# ============================================================================
# Ejecutar este script en PowerShell para configurar las variables de entorno
# en Cloudflare Workers.
#
# PRERREQUISITOS:
# - Tener wrangler instalado: npm install -g wrangler
# - Estar autenticado: wrangler auth login
# - Tener acceso al worker "tallerconecta"
# ============================================================================

# ============================================================================
# PASO 1: Configurar variables de entorno SMTP
# ============================================================================
# Reemplaza los valores con tus credenciales reales de SMTP

# Opción A: Configurar individualmente
wrangler secret put SMTP_HOST --name tallerconecta
# Ingresar: smtp.tudominio.co (o smtp.sendgrid.net, smtp.gmail.com, etc.)

wrangler secret put SMTP_USER --name tallerconecta
# Ingresar: tu_usuario@tudominio.co

wrangler secret put SMTP_PASS --name tallerconecta
# Ingresar: tu_contraseña_de_correo

# ============================================================================
# Opción B: Configurar todas de una vez (requiere crear un archivo .env primero)
# ============================================================================
# Crear archivo .env.vars con:
#   SMTP_HOST=smtp.tudominio.co
#   SMTP_USER=tu_usuario@tudominio.co
#   SMTP_PASS=tu_contraseña
#
# Luego ejecutar:
#   wrangler secret put --from=.env.vars --name tallerconecta

# ============================================================================
# PASO 2: Verificar que las variables se configuraron correctamente
# ============================================================================
wrangler secret list --name tallerconecta

# ============================================================================
# PASO 3: Redesplegar el worker para aplicar los cambios
# ============================================================================
# wrangler deploy

echo "=========================================================================="
echo "CONFIGURACIÓN COMPLETADA"
echo "=========================================================================="
echo "Variables configuradas:"
echo "  - SMTP_HOST: Tu servidor SMTP"
echo "  - SMTP_USER: Tu usuario de correo"
echo "  - SMTP_PASS: Tu contraseña (oculta por seguridad)"
echo ""
echo "El worker ahora usará SMTP real para enviar correos."
echo "=========================================================================="
