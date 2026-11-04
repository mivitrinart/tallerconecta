import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Seguridad" };

export default function SeguridadPage() {
  return (
    <>
      <h1>Política de Seguridad de la Información</h1>
      <p className="text-sm text-slate-400">
        Medidas técnicas y organizativas del MVP — alineadas con la Ley 1581 de 2012 (art. 17: seguridad de los
        datos) y con el módulo “Seguridad y aspectos legales” del proyecto.
      </p>

      <h2>1. Separación de talleres (multi-tenant)</h2>
      <ul>
        <li><strong>Row Level Security (RLS) en PostgreSQL:</strong> todas las tablas operativas incluyen <code>workshop_id</code>; las políticas de Supabase filtran cada lectura/escritura por el taller de la sesión (<code>supabase/migrations/0001_initial_schema.sql</code>).</li>
        <li><strong>Validación en el servidor:</strong> cada ruta de API revalida sesión, rol, permiso y pertenencia al taller antes de leer o mutar (<code>lib/auth/guards.ts</code>). <strong>Nunca se confía únicamente en el frontend.</strong></li>
        <li>Un empleado o cliente de un taller no puede enumerar ni acceder a datos de otro, ni siquiera conociendo identificadores (devuelven 404).</li>
      </ul>

      <h2>2. Identidad y sesiones</h2>
      <ul>
        <li>Cookies <code>httpOnly</code> + <code>SameSite=Lax</code> + <code>Secure</code> en producción; tokens JWT firmados (HS256) con expiración de 12 horas.</li>
        <li>Roles con permisos mínimos: propietario, asesor, mecánico (solo trabajos asignados y avances), administrador de plataforma y cliente.</li>
        <li>En producción, la autenticación la gestiona <strong>Supabase Auth</strong> (hash de contraseñas, MFA disponible, recuperación de acceso).</li>
        <li>El portal del cliente por enlace personal usa tokens aleatorios de 128 bits, intransferibles y revocables (se rotan al anonimizar la ficha).</li>
      </ul>

      <h2>3. Autorizaciones inmutables</h2>
      <ul>
        <li>Cada decisión del cliente registra: <strong>versión del presupuesto, usuario que decide, fecha/hora, ítems aprobados y rechazados y monto aprobado</strong> (tabla <code>authorizations</code>).</li>
        <li>Una autorización emitida <strong>no se modifica retrospectivamente</strong>: cualquier cambio de precio o alcance genera una versión nueva del presupuesto que exige una nueva decisión.</li>
        <li>El sistema impide pasar una orden a reparación mientras existan trabajos pendientes de autorización (regla validada en servidor y cubierta por pruebas).</li>
      </ul>

      <h2>4. Historial y auditoría</h2>
      <ul>
        <li><code>order_events</code>: línea de tiempo completa de la orden (creación, cambios de estado con motivo, diagnósticos, presupuestos, autorizaciones, evidencias, entregas).</li>
        <li><code>audit_logs</code>: acciones sensibles con actor, acción, entidad y detalle (cancelaciones, cambios de plan, supresiones de datos, inicios de sesión).</li>
        <li>Los mensajes cliente ↔ taller se conservan íntegros; ninguna de estas tablas permite borrado por el personal del taller (solo por políticas de retención administradas).</li>
      </ul>

      <h2>5. Archivos privados (fotografías, documentos, comprobantes)</h2>
      <ul>
        <li>Los archivos <strong>no son públicos</strong>. Se almacenan en un bucket privado de Supabase Storage.</li>
        <li>El acceso se sirve por el servidor (<code>/api/media/[id]</code>) validando: personal del taller dueño, cuenta de cliente vinculada o enlace personal vigente; y solo evidencia marcada <code>visible_cliente</code>.</li>
        <li>Las respuestas usan <strong>enlaces firmados y temporales</strong> (URLs firmadas con expiración corta; cabeceras <code>Cache-Control: private, no-store</code> en el modo demo).</li>
        <li>Las imágenes del cliente se comprimen en su dispositivo antes de subir (menor exposición y costo).</li>
      </ul>

      <h2>6. Pagos</h2>
      <ul>
        <li><strong>La primera versión NO almacena datos de tarjetas ni implementa una pasarela de pagos</strong>: el cobro de la reparación ocurre fuera de la plataforma. Se elimina así una superficie de riesgo (PCI-DSS) innecesaria para el MVP.</li>
        <li>La suscripción del taller se cobrará mediante un proveedor externo certificado cuando se active la facturación.</li>
      </ul>

      <h2>7. Privacidad del cliente y minimización</h2>
      <ul>
        <li>El taller solo consulta la información necesaria para prestar el servicio: contactos, vehículo, orden y su historial.</li>
        <li>El cliente solo ve <strong>sus propios</strong> servicios, evidencias marcadas como visibles y sus mensajes.</li>
        <li>Validación estricta de entradas (esquemas zod en <code>lib/validations</code>): longitudes, tipos y rangos en cada mutación.</li>
        <li>Notificaciones con regla de veracidad: solo se emiten ante cambios reales registrados por el taller; las fechas se identifican como estimaciones.</li>
      </ul>

      <h2>8. Operación segura</h2>
      <ul>
        <li>HTTPS obligatorio en producción; cabeceras de seguridad configurables (CSP, HSTS, nosniff).</li>
        <li>Backups administrados por Supabase (PITR disponible según plan); el modo demo persiste en un archivo local.</li>
        <li>Registro e investigación de incidentes: ante una brecha, se notificará a la SIC y a los responsables/titulares conforme a la ley, con acciones de contención y corrección.</li>
        <li>Pruebas automatizadas de las reglas de seguridad (aislamiento, permisos, máquina de estados) en <code>tests/</code> y smoke E2E.</li>
      </ul>

      <div className="aviso">
        <strong>Alcance:</strong> esta política describe el MVP en modo demostración. Para producción se recomienda
        un análisis de riesgos formal, cifrado de campos sensibles en reposo si aplica, monitoreo continuo y una
        revisión jurídica de las obligaciones concretas en Colombia según el modelo comercial y los flujos de datos.
      </div>
    </>
  );
}
