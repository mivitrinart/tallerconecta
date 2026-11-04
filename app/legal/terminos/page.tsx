import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos y Condiciones de Uso" };

export default function TerminosPage() {
  return (
    <>
      <h1>Términos y Condiciones de Uso</h1>
      <p className="text-sm text-slate-400">
        Taller Conecta — plataforma SaaS para talleres mecánicos y sus clientes (Colombia).
      </p>

      <div className="aviso">
        Al registrarte como taller, crear una cuenta de cliente o usar un enlace personal de seguimiento, aceptas
        estos términos. Si no estás de acuerdo, no uses la plataforma.
      </div>

      <h2>1. Qué es Taller Conecta</h2>
      <p>
        Una plataforma que conecta talleres mecánicos con sus clientes para: registrar órdenes de servicio,
        compartir diagnósticos y evidencias fotográficas, enviar presupuestos, obtener la aprobación del cliente por
        cada trabajo, centralizar la mensajería y notificar los cambios reales de estado. Se presta como aplicación
        web adaptable a celulares y computadores.
      </p>

      <h2>2. Roles y responsabilidades</h2>
      <h3>2.1 Del taller (suscriptor)</h3>
      <ul>
        <li>Es el <strong>responsable del tratamiento</strong> de los datos de sus clientes y debe contar con su autorización previa, expresa e informada antes de registrarlos.</li>
        <li>Es responsable de la <strong>veracidad y calidad del servicio</strong>: diagnósticos, presupuestos, repuestos, mano de obra, tiempos y garantías. La plataforma no presta servicios mecánicos ni interviene en el contrato de reparación.</li>
        <li>Debe mantener actualizados los estados de las órdenes: las notificaciones al cliente reflejan lo que el taller registra. <strong>Una fecha estimada de entrega es una estimación, no una promesa.</strong></li>
        <li>Debe gestionar sus usuarios internos (propietario, asesores, mecánicos) y responder por las acciones realizadas con sus credenciales.</li>
        <li>No debe cargar contenidos ilícitos, de terceros sin autorización, ni usar la plataforma para fines distintos al servicio.</li>
        <li>Debe atender las solicitudes de sus clientes (consultas, aprobaciones, reclamos de datos) en los términos de la ley.</li>
      </ul>
      <h3>2.2 De la plataforma (Taller Conecta)</h3>
      <ul>
        <li>Prestar el servicio con disponibilidad razonable y dar soporte al suscriptor.</li>
        <li>Garantizar el <strong>aislamiento de datos entre talleres</strong> (cada taller es un espacio privado) y aplicar las medidas de seguridad de la <a href="/legal/seguridad" className="font-semibold text-brand-600 underline">Política de Seguridad</a>.</li>
        <li>Conservar la integridad de los registros: autorizaciones, mensajes, cambios de estado y auditoría <strong>no se modifican retrospectivamente</strong>.</li>
        <li>Tratar los datos como <strong>encargado</strong> según la <a href="/legal/privacidad" className="font-semibold text-brand-600 underline">Política de Tratamiento de Datos</a>.</li>
        <li>No usar los datos operativos de los talleres para fines ajenos al servicio ni venderlos a terceros.</li>
      </ul>
      <h3>2.3 Del cliente final</h3>
      <ul>
        <li>Recibe un <strong>enlace personal e intransferible</strong> de seguimiento (o crea una cuenta con su correo). Es responsable de su custodia y de no compartirlo.</li>
        <li>Sus decisiones de aprobación o rechazo de presupuestos se registran con fecha, versión y contenido. <strong>Aprobar un presupuesto autoriza al taller a ejecutar esos trabajos por ese valor.</strong></li>
        <li>Los trabajos adicionales requieren una autorización nueva (versión nueva del presupuesto).</li>
        <li>Debe usar los canales de mensajería de forma respetuosa y lícita.</li>
      </ul>

      <h2>3. Autorizaciones de reparación (registro probatorio)</h2>
      <p>
        Cada decisión del cliente queda asociada a una <strong>versión concreta del presupuesto</strong> y registra:
        usuario que decide, fecha y hora, ítems aprobados y rechazados, y monto aprobado. Si cambia el precio o el
        alcance, se genera una versión nueva que requiere aprobación nuevamente. Este registro es la prueba de las
        decisiones del cliente y ambas partes reconocen su validez como medio electrónico (Ley 527 de 1999).
      </p>

      <h2>4. Cuenta de cliente</h2>
      <ul>
        <li>Es <strong>opcional</strong>: el seguimiento funciona con el enlace personal sin crear cuenta.</li>
        <li>La cuenta reúne en una sola ventana las fichas vinculadas por correo o por enlace personal, con perfil editable.</li>
        <li>El cliente puede desvincular fichas y solicitar la eliminación de su cuenta en cualquier momento (derecho de supresión).</li>
      </ul>

      <h2>5. Planes, pruebas y pagos</h2>
      <ul>
        <li>La plataforma se ofrece por suscripción mensual por taller (planes Starter, Pro y Premium), con período de prueba gratuito.</li>
        <li><strong>En esta versión la plataforma NO procesa pagos del servicio de reparación ni almacena datos de tarjetas</strong>: el cobro de la reparación ocurre entre el cliente y el taller por los medios que ellos acuerden. No se implementa una pasarela de pagos innecesaria para el MVP.</li>
        <li>El cobro de la suscripción del taller se realizará mediante un proveedor de facturación externo cuando se active; los precios de la demo son ilustrativos.</li>
        <li>La mora o el uso indebido pueden dar lugar a la suspensión del acceso, preservando la integridad y exportación de los datos del taller.</li>
      </ul>

      <h2>6. Propiedad intelectual</h2>
      <p>
        La plataforma, su código, marcas y diseño pertenecen a Taller Conecta. Los contenidos operativos
        (fotografías, diagnósticos, mensajes) pertenecen al taller y a sus clientes en lo que corresponda; la
        plataforma recibe únicamente la licencia de uso necesaria para prestar el servicio.
      </p>

      <h2>7. Disponibilidad, soporte y cambios del servicio</h2>
      <ul>
        <li>Se trabajará por una disponibilidad objetivo razonable para un MVP; las ventanas de mantenimiento se anunciarán cuando la operación lo amerite.</li>
        <li>La plataforma puede evolucionar (nuevos módulos, ajustes de UX). Los cambios sustanciales de estos términos se notificarán a los suscriptores con antelación.</li>
      </ul>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        La plataforma es un canal de gestión y comunicación: <strong>no responde por la calidad, idoneidad,
        garantía, precios o cumplimiento de las reparaciones</strong>, que corresponden exclusivamente al taller,
        ni por decisiones del cliente basadas en la información que el propio taller registra. La responsabilidad
        total de la plataforma, en cualquier caso, se limita al valor de las suscripciones pagadas por el taller en
        los tres (3) meses anteriores al hecho.
      </p>

      <h2>9. Datos personales</h2>
      <p>
        El tratamiento de datos se rige por la{" "}
        <a href="/legal/privacidad" className="font-semibold text-brand-600 underline">Política de Tratamiento de Datos Personales</a>{" "}
        (Ley 1581 de 2012), que forma parte integral de estos términos.
      </p>

      <h2>10. Terminación</h2>
      <ul>
        <li>El taller puede cancelar su suscripción en cualquier momento; el cliente puede eliminar su cuenta en cualquier momento.</li>
        <li>Al terminar, se habilita la exportación de los datos del taller y, tras el período de conservación legal (ver política de privacidad), la supresión o anonimización correspondiente.</li>
      </ul>

      <h2>11. Ley aplicable y solución de controversias</h2>
      <p>
        Estos términos se rigen por las leyes de la República de Colombia. Las controversias se intentarán resolver
        directamente por 15 días calendario y, en su defecto, ante los jueces competentes del domicilio del
        suscriptor o mediante conciliación extrajudicial en derecho.
      </p>

      <div className="aviso">
        <strong>Nota de la demostración:</strong> documento de referencia del MVP con datos ficticios. Las
        obligaciones concretas según el modelo comercial, los flujos de datos y la forma de prestar el servicio deben
        revisarse con asesoría jurídica en Colombia antes del lanzamiento comercial.
      </div>
    </>
  );
}
