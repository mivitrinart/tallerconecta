import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Tratamiento de Datos Personales" };

export default function PoliticaPrivacidadPage() {
  return (
    <>
      <h1>Política de Tratamiento de Datos Personales</h1>
      <p className="text-sm text-slate-400">
        Vigente desde el despliegue del MVP · Marco normativo: Ley 1581 de 2012, Decreto 1377 de 2013,
        Decreto 1074 de 2015 y normas concordantes (Colombia).
      </p>

      <div className="aviso">
        <strong>Aviso de privacidad (resumen):</strong> Taller Conecta y los talleres registrados tratan datos de
        contacto, vehículos (placa, marca, modelo, año, kilometraje), fotografías del servicio, presupuestos y las
        decisiones de aprobación del cliente, con la única finalidad de prestar el servicio de seguimiento de
        reparaciones. El titular puede conocer, actualizar, rectificar y solicitar la supresión de sus datos, y
        presentar reclamos ante la Superintendencia de Industria y Comercio (SIC).
      </div>

      <h2>1. Responsables y encargados del tratamiento</h2>
      <ul>
        <li>
          <strong>Taller Conecta (la plataforma):</strong> actúa como <strong>encargado</strong> del tratamiento de
          los datos operativos del servicio (órdenes, presupuestos, evidencias y mensajes) por cuenta de cada taller,
          y como <strong>responsable</strong> de los datos de las cuentas de usuario (personal del taller,
          propietarios y cuentas de cliente). Contacto: <em>privacidad@tallerconecta.co</em> (referencia demo).
        </li>
        <li>
          <strong>Cada taller registrado:</strong> es <strong>responsable</strong> de los datos de sus propios
          clientes y del servicio que presta. El taller debe contar con la autorización previa, expresa e informada
          del cliente antes de registrar sus datos en la plataforma (arts. 9 y 10, Ley 1581 de 2012).
        </li>
      </ul>

      <h2>2. Datos que tratamos y finalidades</h2>
      <table>
        <thead>
          <tr><th>Categoría</th><th>Datos</th><th>Finalidad</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Clientes del taller</td>
            <td>Nombre, teléfono, correo, documento (opcional), dirección de contacto</td>
            <td>Prestar el servicio, enviar notificaciones del estado del vehículo, responder consultas y emitir el presupuesto</td>
          </tr>
          <tr>
            <td>Vehículos</td>
            <td>Placa, tipo, marca, modelo, año, kilometraje, color, daños visibles</td>
            <td>Identificar el vehículo en la orden de servicio y mantener su historial. La placa no se usa como identificador único</td>
          </tr>
          <tr>
            <td>Servicio</td>
            <td>Diagnósticos, fotografías (antes/durante/después), presupuestos, decisiones de aprobación, mensajes, calificaciones</td>
            <td>Trazabilidad del servicio, prueba de las autorizaciones del cliente y transparencia</td>
          </tr>
          <tr>
            <td>Usuarios de la plataforma</td>
            <td>Nombre, correo, teléfono, credenciales (gestión de Supabase Auth en producción), rol y taller</td>
            <td>Autenticación, control de acceso y administración del SaaS</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Principio de finalidad y necesidad:</strong> el taller solo debe consultar y registrar la
        información estrictamente necesaria para prestar el servicio (privacidad del cliente). No se tratan datos
        sensibles por defecto; si un caso los requiriera, se solicitará autorización explícita adicional.
      </p>

      <h2>3. Base legal del tratamiento</h2>
      <ul>
        <li><strong>Consentimiento del titular:</strong> otorgado (i) al taller al autorizar la reparación y el registro de sus datos, (ii) en la plataforma al crear una cuenta de cliente o de taller marcando la casilla de autorización, y (iii) mediante el uso del enlace personal de seguimiento informado por el taller.</li>
        <li><strong>Ejecución de un contrato:</strong> el contrato de prestación de servicio de reparación entre el cliente y el taller.</li>
        <li><strong>Obligaciones legales:</strong> conservación de registros de autorizaciones, facturación y garantía del servicio.</li>
      </ul>
      <p>
        La plataforma conserva evidencia del consentimiento: fecha y origen (<code>consentimiento_datos_at</code> y{" "}
        <code>consentimiento_origen</code> en cada ficha de cliente y cuenta).
      </p>

      <h2>4. Derechos del titular (art. 8, Ley 1581 de 2012)</h2>
      <ol>
        <li>Conocer, actualizar y rectificar sus datos personales.</li>
        <li>Solicitar prueba de la autorización otorgada.</li>
        <li>Ser informado sobre el uso que se ha dado a sus datos.</li>
        <li>Presentar quejas ante la SIC por infracciones a la ley.</li>
        <li>Revocar la autorización y/o solicitar la supresión del dato cuando el tratamiento no respete los principios, derechos y garantías constitucionales y legales.</li>
        <li>Acceder gratuitamente a sus datos personales tratados.</li>
      </ol>

      <h3>Procedimiento para ejercer los derechos</h3>
      <ul>
        <li>
          <strong>Actualización/rectificación:</strong> desde el perfil de la cuenta de cliente, o escribiendo al
          taller o a <em>soporte@tallerconecta.co</em>.
        </li>
        <li>
          <strong>Supresión de la cuenta de cliente:</strong> botón “Eliminar mi cuenta” en <em>/cuenta</em>
          (borrado lógico: se eliminan la cuenta y sus vinculaciones).
        </li>
        <li>
          <strong>Supresión/anonimización de la ficha en un taller:</strong> el cliente lo solicita al taller; el
          propietario ejecuta “Anonimizar datos” en la ficha del cliente. Se eliminan los datos de contacto y se
          invalida el enlace personal. <strong>Se conserva el historial de órdenes y autorizaciones</strong> porque
          constituye prueba de las decisiones del cliente y soporte de obligaciones legales y de garantía del taller.
        </li>
        <li>
          <strong>Reclamos:</strong> se atienden en un término máximo de <strong>15 días hábiles</strong>
          (prorrogables por 8 días hábiles más, art. 15, Ley 1581) a través de <em>soporte@tallerconecta.co</em> o
          directamente ante el taller responsable.
        </li>
      </ul>

      <h2>5. Seguridad de los datos</h2>
      <ul>
        <li><strong>Aislamiento por taller:</strong> políticas de seguridad por fila (Row Level Security) en PostgreSQL; cada tabla operativa incluye <code>workshop_id</code> y las consultas lo filtran obligatoriamente.</li>
        <li><strong>Validación en el servidor:</strong> toda acción se revalida en la API (sesión, rol, permisos y pertenencia al taller). Nunca se confía únicamente en el frontend.</li>
        <li><strong>Archivos privados:</strong> las fotografías y documentos no son públicos; se acceden mediante el servidor con control de acceso y enlaces temporales (URLs firmadas con expiración en producción).</li>
        <li><strong>Sesiones:</strong> cookies httpOnly con tokens firmados y expiración corta (12 h).</li>
        <li><strong>Autorizaciones inmutables:</strong> cada aprobación/rechazo registra versión del presupuesto, usuario, fecha y resultado; no se modifica retrospectivamente.</li>
        <li><strong>Auditoría:</strong> los cambios de estado, decisiones y accesos relevantes quedan en <code>audit_logs</code> e <code>order_events</code>.</li>
      </ul>
      <p>Detalle técnico completo en la <a href="/legal/seguridad" className="font-semibold text-brand-600 underline">Política de Seguridad</a>.</p>

      <h2>6. Conservación y eliminación</h2>
      <ul>
        <li><strong>Cuentas y fichas activas:</strong> mientras dure la relación comercial.</li>
        <li><strong>Órdenes, presupuestos y autorizaciones:</strong> hasta <strong>5 años</strong> después del cierre, como soporte de garantías, obligaciones comerciales y tributarias del taller.</li>
        <li><strong>Fotografías del servicio:</strong> se conservan con la orden; se suprimen o anonimizan con ella.</li>
        <li><strong>Auditoría:</strong> hasta 5 años por integridad probatoria.</li>
        <li>Tras una solicitud de supresión, los datos de contacto se anonimizan de forma irreversible y el resto se conserva únicamente por las obligaciones legales citadas.</li>
      </ul>

      <h2>7. Transferencias y encargados</h2>
      <p>
        La infraestructura opera sobre proveedores de nube (Supabase/PostgreSQL, correo transaccional y, cuando se
        habilite, WhatsApp Business Platform). Cada proveedor actúa como encargado con contrato de tratamiento de
        datos. Las transferencias internacionales (si las hubiera) se realizan a proveedores con cláusulas de
        protección adecuadas y se informarán en esta política. <strong>No vendemos ni compartimos datos con fines
        publicitarios de terceros.</strong>
      </p>

      <h2>8. Registro Nacional de Bases de Datos</h2>
      <p>
        Cuando la operación lo exija (obligación de la Circular Única Jurídica de la SIC para responsables que
        superen los topes de activos/ingresos), las bases de datos se registrarán o actualizarán en el RNBD.
      </p>

      <h2>9. Vigencia y cambios</h2>
      <p>
        Esta política rige desde su publicación. Los cambios sustanciales se notificarán por los canales de contacto
        registrados y, cuando la ley lo exija, se solicitará una nueva autorización.
      </p>

      <div className="aviso">
        <strong>Nota de la demostración:</strong> este documento es una plantilla de referencia del MVP con datos
        ficticios. Antes de operar comercialmente en Colombia, el texto definitivo, los roles de
        responsable/encargado según el modelo comercial y los flujos de datos deben revisarse con asesoría jurídica.
      </div>
    </>
  );
}
