## Proyecto: Taller Conecta

La propuesta es crear una plataforma que conecte a los talleres mecánicos con sus clientes para mejorar la atención, reducir las llamadas y los mensajes repetitivos, agilizar las autorizaciones de reparación y aumentar la confianza durante el servicio.

Mi recomendación es comenzar en Colombia con una aplicación web adaptable a celulares y computadores, que posteriormente pueda convertirse en una app móvil. Así puedes validar el negocio sin asumir desde el principio los costos de desarrollar dos aplicaciones nativas.

[cars24.com](https://www.cars24.com/article/role-of-standardised-car-inspections-in-ensuring-fair-car-valuations/)

Para el taller

Control de órdenes, mecánicos, presupuestos y clientes.

Para el cliente

Seguimiento, fotos, autorizaciones y comunicación.

Atención centralizada

Menos consultas repetidas y respuestas más oportunas.

Transparencia

Historial del servicio y evidencia de las decisiones del cliente.

## 1\. Objetivo principal del MVP

El MVP (Producto Mínimo Viable) debe resolver un problema específico y hacerlo bien:

Que el cliente siempre sepa qué sucede con su carro o moto, cuánto cuesta la reparación y qué debe aprobar, sin tener que llamar al taller.

El primer producto tendrá tres áreas:

-   Panel del taller: administra la operación y las órdenes.
-   Portal del cliente: consulta el estado y toma decisiones.
-   Panel de administración de la plataforma: gestiona talleres, planes y usuarios del SaaS.

No comenzaría con un marketplace de talleres, inventarios complejos, contabilidad completa ni inteligencia artificial avanzada. Primero hay que comprobar que los talleres paguen por mejorar la atención y que los clientes realmente utilicen el seguimiento.

## 2\. Roles y permisos

| Rol                            | Qué puede hacer                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Administrador de la plataforma | Gestionar talleres registrados, suscripciones y soporte.                                       |
| Propietario del taller         | Configurar el negocio, gestionar empleados, clientes y órdenes.                                |
| Asesor de servicio             | Recibir vehículos, registrar diagnósticos, elaborar presupuestos y responder consultas.        |
| Mecánico                       | Consultar trabajos asignados, actualizar avances y cargar evidencias.                          |
| Cliente                        | Consultar sus vehículos, ver el diagnóstico, aprobar presupuestos y comunicarse con el taller. |

Cada taller debe tener su propio espacio privado. Un empleado o cliente de un taller nunca debe poder acceder a los datos de otro.

## 3\. Módulos funcionales del MVP

Módulo 1. Panel principal del taller

-   Vehículos recibidos hoy.
-   Órdenes en diagnóstico, reparación y espera.
-   Presupuestos pendientes de aprobación.
-   Vehículos listos para entregar.
-   Alertas de clientes sin respuesta o trabajos retrasados.

Módulo 2. Clientes y vehículos

-   Nombre, teléfono y correo del cliente.
-   Carro o moto, placa, marca, modelo y año.
-   Kilometraje y observaciones de recepción.
-   Historial de visitas y reparaciones.
-   Búsqueda por nombre, placa o número de orden.

Módulo 3. Órdenes de servicio

-   Número de orden único.
-   Motivo de ingreso y síntomas reportados.
-   Diagnóstico y trabajos recomendados.
-   Mecánico responsable.
-   Fotografías del antes, durante y después.
-   Fecha estimada de entrega y notas internas.

Módulo 4. Presupuestos y autorizaciones

-   Repuestos, cantidades y precios.
-   Mano de obra y servicios adicionales.
-   Descuentos, impuestos aplicables y total.
-   Envío del presupuesto al cliente.
-   Aprobación o rechazo de cada propuesta.
-   Registro de fecha, usuario y versión autorizada.

Módulo 5. Portal del cliente

-   Acceso seguro desde un enlace personal.
-   Estado actualizado de su vehículo.
-   Presupuesto y diagnóstico.
-   Evidencias fotográficas.
-   Botones para aprobar o rechazar.
-   Canal para enviar preguntas al taller.

Módulo 6. Notificaciones y atención

-   Aviso de vehículo recibido.
-   Diagnóstico listo.
-   Presupuesto pendiente.
-   Reparación iniciada y finalizada.
-   Vehículo listo para recoger.
-   Avisos de mensajes nuevos y respuestas pendientes.

Regla fundamental: una notificación nunca debe afirmar que algo sucedió si el taller no actualizó el estado. Las fechas estimadas deben identificarse como estimaciones, no como promesas.

## 4\. Flujo completo de atención al cliente

Este es el flujo central que debe funcionar desde el primer día.

1\. Recepción del vehículo

Se registra el cliente, el vehículo, el kilometraje, los daños visibles y el motivo de ingreso.

2\. Diagnóstico

El asesor o mecánico registra los hallazgos, recomendaciones y fotografías.

3\. Presupuesto enviado

El cliente recibe el detalle de repuestos, mano de obra, servicios y total.

4\. Decisión del cliente

Aprobar

Rechazar

Consultar

El taller conserva el resultado de la decisión. Los trabajos adicionales requieren una autorización nueva.

5\. Reparación y seguimiento

Se registran avances, evidencias y novedades. El cliente recibe actualizaciones.

6\. Entrega y cierre

Se registra la finalización, el valor final, la entrega del vehículo y la calificación del servicio.

### Estados que debe manejar una orden

| Estado               | Significado                                                   |
| -------------------- | ------------------------------------------------------------- |
| Recibido             | El taller registró el vehículo.                               |
| En diagnóstico       | Se están identificando los problemas.                         |
| Esperando aprobación | El cliente debe decidir sobre el presupuesto.                 |
| Autorizado           | Se puede iniciar el trabajo aprobado.                         |
| En reparación        | El mecánico está trabajando.                                  |
| En espera            | Falta un repuesto, una respuesta u otro recurso.              |
| En pruebas           | Se verifica el trabajo realizado.                             |
| Listo para entregar  | El servicio terminó y el vehículo está pendiente de recogida. |
| Entregado            | El cliente recibió el vehículo.                               |
| Cancelado            | La orden fue cancelada y se registró el motivo.               |

Los estados no deben permitir que una orden pase directamente a reparación si existe un trabajo que requiere autorización y aún está pendiente. Si hay varios trabajos, el sistema debe distinguir cuáles están aprobados y cuáles no.

## 5\. Diseño de las pantallas

La primera versión debe ser fácil de usar en un celular, especialmente para mecánicos y clientes.

## Prototipo funcional de navegación

Explora una representación de las pantallas principales del producto.

Panel del tallerPortal del cliente

InicioÓrdenesClientesMensajes

TALLER MOTORX / RESUMEN

# Panel de control

Órdenes activas

# 12

Por aprobar

# 3

En reparación

# 6

Listos

# 2

Pendientes de atención

Orden #1048 · Mazda 3

Presupuesto pendiente de aprobación

Esperando cliente

Orden #1049 · Yamaha FZ

Falta registrar diagnóstico

Los datos, cifras y vehículos de esta maqueta son ficticios. Es una demostración de navegación, no una aplicación conectada a un servidor.

## 6\. Estructura de la base de datos

Propongo una base de datos relacional con PostgreSQL. Cada entidad debe tener un identificador único y las tablas operativas deben incluir el identificador del taller para aislar los datos.

| Tabla            | Campos principales                                                            |
| ---------------- | ----------------------------------------------------------------------------- |
| workshops        | id, nombre, NIT opcional, dirección, teléfono, plan, estado                   |
| users            | id, nombre, correo, teléfono, estado                                          |
| workshop_members | workshop_id, user_id, rol, permisos                                           |
| customers        | id, workshop_id, nombre, teléfono, correo                                     |
| vehicles         | id, workshop_id, customer_id, placa, tipo, marca, modelo, año, kilometraje    |
| service_orders   | id, workshop_id, customer_id, vehicle_id, número, estado, fechas, responsable |
| diagnostics      | id, service_order_id, descripción, recomendaciones, creado_por                |
| estimates        | id, service_order_id, versión, subtotal, impuestos, total, estado             |
| estimate_items   | id, estimate_id, tipo, descripción, cantidad, precio_unitario                 |
| authorizations   | id, estimate_id, decisión, usuario, fecha, versión aceptada                   |
| order_media      | id, service_order_id, archivo, categoría, autor, fecha                        |
| order_events     | id, service_order_id, estado_anterior, estado_nuevo, usuario, fecha           |
| messages         | id, service_order_id, remitente, contenido, fecha, leído                      |
| notifications    | id, user_id, tipo, estado, fecha, canal                                       |
| subscriptions    | id, workshop_id, plan, estado, vigencia                                       |
| audit_logs       | id, workshop_id, actor, acción, entidad, fecha                                |

### Relaciones esenciales

#chatgpt-mermaid-\_r\_lf\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(13, 13, 13);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r\_lf\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r\_lf\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r\_lf\_ .error-icon{fill:rgb(243, 243, 243);}#chatgpt-mermaid-\_r\_lf\_ .error-text{fill:rgb(13, 13, 13);stroke:rgb(13, 13, 13);}#chatgpt-mermaid-\_r\_lf\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r\_lf\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r\_lf\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r\_lf\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r\_lf\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r\_lf\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r\_lf\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r\_lf\_ .marker.cross{stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r\_lf\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r\_lf\_ p{margin:0;}#chatgpt-mermaid-\_r\_lf\_ .entityBox{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);}#chatgpt-mermaid-\_r\_lf\_ .relationshipLabelBox{fill:rgb(243, 243, 243);opacity:0.7;background-color:rgb(243, 243, 243);}#chatgpt-mermaid-\_r\_lf\_ .relationshipLabelBox rect{opacity:0.5;}#chatgpt-mermaid-\_r\_lf\_ .labelBkg{background-color:rgba(243, 243, 243, 0.5);}#chatgpt-mermaid-\_r\_lf\_ .edgeLabel{background-color:rgb(252, 252, 252);}#chatgpt-mermaid-\_r\_lf\_ .edgeLabel .label rect{fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r\_lf\_ .edgeLabel .label text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r\_lf\_ .edgeLabel .label{fill:rgb(83, 154, 248);font-size:14px;}#chatgpt-mermaid-\_r\_lf\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r\_lf\_ .edge-pattern-dashed{stroke-dasharray:8,8;}#chatgpt-mermaid-\_r\_lf\_ .node rect,#chatgpt-mermaid-\_r\_lf\_ .node circle,#chatgpt-mermaid-\_r\_lf\_ .node ellipse,#chatgpt-mermaid-\_r\_lf\_ .node polygon{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-\_r\_lf\_ .relationshipLine{stroke:rgb(143, 143, 143);stroke-width:1px;fill:none;}#chatgpt-mermaid-\_r\_lf\_ .marker{fill:none!important;stroke:rgb(143, 143, 143)!important;stroke-width:1;}#chatgpt-mermaid-\_r\_lf\_ \[data-look=neo\].labelBkg{background-color:rgba(243, 243, 243, 0.5);}#chatgpt-mermaid-\_r\_lf\_ .node .neo-node{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].node rect,#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].cluster rect,#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].node polygon{stroke:url(#chatgpt-mermaid-\_r\_lf\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].node path{stroke:url(#chatgpt-mermaid-\_r\_lf\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].node .neo-line path{stroke:rgb(83, 154, 248);filter:none;}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].node circle{stroke:url(#chatgpt-mermaid-\_r\_lf\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r\_lf\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r\_lf\_ \[data-look="neo"\].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r\_lf\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r\_lf\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}WORKSHOPSWORKSHOP\_MEMBERSUSERSCUSTOMERSVEHICLESSERVICE\_ORDERSDIAGNOSTICSESTIMATESESTIMATE\_ITEMSAUTHORIZATIONSORDER\_MEDIAORDER\_EVENTSMESSAGEStieneperteneceregistraposeeingresasolicitacontienegeneradetallarecibedocumentaregistracomunica

Detalles técnicos importantes:

-   Las autorizaciones deben referirse a una versión concreta del presupuesto. Si cambia el precio o el alcance, se crea una versión nueva que debe aprobarse de nuevo.
-   El precio autorizado y el presupuesto deben conservarse aunque posteriormente cambien los precios del catálogo.
-   La placa no debe ser la clave primaria: pueden existir errores de digitación, cambios de matrícula o vehículos extranjeros.
-   Las imágenes deben guardarse en almacenamiento privado, no como archivos públicos sin control.
-   Los mensajes, cambios de estado y autorizaciones deben conservar su historial para auditoría.

## 7\. Tecnología recomendada

Para desarrollar el MVP de forma profesional, rápida y preparada para crecer, utilizaría esta arquitectura:

Frontend: Next.js + TypeScript

Interfaz responsive para el panel del taller, el cliente y el administrador.

[Sitio oficial](https://nextjs.org/)

Backend: Supabase

PostgreSQL, autenticación, almacenamiento y actualizaciones en tiempo real.

[Sitio oficial](https://supabase.com/)

Diseño: Tailwind CSS

Sistema visual consistente, formularios y componentes adaptables a dispositivos móviles.

[Sitio oficial](https://tailwindcss.com/)

Notificaciones: correo y WhatsApp

Correo transaccional al inicio; WhatsApp Business Platform mediante integración autorizada cuando el MVP esté validado.

[Documentación de WhatsApp](https://developers.facebook.com/docs/whatsapp/)

### ¿Por qué esta combinación?

-   Permite desarrollar un producto web sin mantener inicialmente aplicaciones separadas para Android y iOS.
-   PostgreSQL facilita relacionar clientes, vehículos, presupuestos y órdenes.
-   La autenticación y las políticas de acceso de la base de datos ayudan a separar la información de cada taller.
-   La plataforma puede ampliarse posteriormente con pagos, facturación electrónica, inteligencia artificial o una aplicación móvil.

Las notificaciones por WhatsApp requieren configuración, consentimiento, plantillas cuando correspondan y consideración de sus costos. No conviene depender de automatizaciones no oficiales.

## 8\. Arquitectura de navegación y rutas

La estructura inicial del proyecto puede organizarse así:  
taller-conecta/

├── app/

│ ├── (publico)/

│ │ ├── page.tsx

│ │ ├── precios/

│ │ └── registro/

│ ├── (auth)/

│ │ ├── login/

│ │ └── recuperar-acceso/

│ ├── taller/

│ │ ├── dashboard/

│ │ ├── ordenes/

│ │ ├── clientes/

│ │ ├── vehiculos/

│ │ ├── mensajes/

│ │ └── configuracion/

│ ├── seguimiento/

│ │ └── \[token\]/

│ ├── admin/

│ │ ├── talleres/

│ │ ├── usuarios/

│ │ └── suscripciones/

│ └── api/

├── components/

│ ├── ui/

│ ├── orders/

│ ├── vehicles/

│ ├── estimates/

│ └── notifications/

├── lib/

│ ├── auth/

│ ├── database/

│ ├── permissions/

│ └── validations/

├── supabase/

│ ├── migrations/

│ └── seed.sql

└── tests/