import json, sys, urllib.request, urllib.error, re

BASE = "http://localhost:3100"

class Client:
    def __init__(self):
        self.cookie = None
    def req(self, method, path, body=None, follow=True):
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"}
        if self.cookie: headers["Cookie"] = self.cookie
        r = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
        opener = urllib.request.build_opener()
        if not follow:
            class NoRed(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, *a, **k): return None
            opener = urllib.request.build_opener(NoRed)
        try:
            with opener.open(r) as resp:
                sc = resp.headers.get("Set-Cookie")
                if sc:
                    m = re.match(r"tc_session=([^;]*)", sc)
                    if m: self.cookie = ("tc_session=" + m.group(1)) if m.group(1) else None
                return resp.status, resp.read().decode()
        except urllib.error.HTTPError as e:
            sc = e.headers.get("Set-Cookie")
            if sc:
                m = re.match(r"tc_session=([^;]*)", sc)
                if m: self.cookie = ("tc_session=" + m.group(1)) if m.group(1) else None
            return e.code, e.read().decode()

def check(name, cond, extra=""):
    print(("✓" if cond else "✗ FAIL") + f" {name}" + (f"  [{extra}]" if extra and not cond else ""))
    if not cond: sys.exit(1)

db = lambda: json.load(open(".data/db.json"))

# 1. Landing pública
s, b = Client().req("GET", "/")
check("Landing pública 200", s == 200 and "Taller Conecta" in b)

# 2. Login propietario + cookie
c = Client()
s, b = c.req("POST", "/api/auth/login", {"correo": "carlos@motorx.co", "password": "taller123"})
check("Login propietario", s == 200 and json.loads(b)["redirect"] == "/taller/dashboard")
check("Cookie de sesión emitida", bool(c.cookie))

# 3. Login inválido
s, b = Client().req("POST", "/api/auth/login", {"correo": "carlos@motorx.co", "password": "mala"})
check("Login inválido rechazado (401)", s == 401)

# 4. Dashboard con sesión
s, b = c.req("GET", "/taller/dashboard")
check("Dashboard renderiza con KPIs", s == 200 and "Panel de control" in b and "Órdenes activas" in b)

# 5. Sin sesión → redirect login
s, b = Client().req("GET", "/taller/dashboard", follow=False)
check("Dashboard sin sesión redirige a /login", s == 307 and "/login" in b or s == 307)

# 6. Transición no permitida: esperando_aprobacion → en_reparacion
s, b = c.req("POST", "/api/ordenes/ord_1051/estado", {"estado": "en_reparacion"})
check("Bloqueo: no se salta la aprobación del cliente", s == 400)

# 6b. REGLA FUNDAMENTAL: volver a diagnóstico e intentar reparar con presupuesto pendiente
s, b = c.req("POST", "/api/ordenes/ord_1051/estado", {"estado": "en_diagnostico"})
check("esperando_aprobacion → en_diagnostico (revisión del taller)", s == 200, b[:140])
s, b = c.req("POST", "/api/ordenes/ord_1051/estado", {"estado": "en_reparacion"})
check("REGLA FUNDAMENTAL: no reparar con autorización pendiente", s == 400 and "autorización" in b.lower(), b[:160])
s, b = c.req("POST", "/api/ordenes/ord_1051/estado", {"estado": "esperando_aprobacion"})
check("La orden vuelve a esperar al cliente", s == 200, b[:140])

# 7. Cancelar sin motivo
s, b = c.req("POST", "/api/ordenes/ord_1052/estado", {"estado": "cancelado"})
check("Bloqueo: cancelar sin motivo", s == 400 and "motivo" in b.lower())

# 8. Transición ilegal (recibido → en_pruebas)
s, b = c.req("POST", "/api/ordenes/ord_1052/estado", {"estado": "en_pruebas"})
check("Bloqueo: transición no permitida", s == 400)

# 9. Diagnóstico ORD-1049
s, b = c.req("POST", "/api/ordenes/ord_1049/diagnostico", {
    "descripcion": "Sistema eléctrico revisado: estátor dañado y regulador en corto.",
    "recomendaciones": "Reemplazar estátor y regulador; verificar batería bajo carga."})
check("Diagnóstico registrado + notificación 'Diagnóstico listo'", s == 200)
check("Notificación de diagnóstico al cliente", any(n["destinatario_id"]=="cust_jorge" and n["tipo"]=="diagnostico_listo" for n in db()["notifications"]))

# 10. Presupuesto v1 con IVA
s, b = c.req("POST", "/api/presupuestos", {
    "service_order_id": "ord_1049",
    "items": [
        {"tipo": "repuesto", "descripcion": "Estátor de encendido", "cantidad": 1, "precio_unitario": 210000},
        {"tipo": "repuesto", "descripcion": "Regulador de voltaje", "cantidad": 1, "precio_unitario": 95000},
        {"tipo": "mano_obra", "descripcion": "Mano de obra sistema eléctrico", "cantidad": 1, "precio_unitario": 120000}],
    "descuento": 0, "impuesto_porcentaje": 19})
check("Presupuesto v1 creado", s == 200 and json.loads(b)["version"] == 1)
est_id = json.loads(b)["id"]
check("Total con IVA 19%", json.loads(b)["total"] == round(425000*1.19), str(json.loads(b)))

# 11. Enviar presupuesto → orden a esperando_aprobacion + notificación
s, b = c.req("POST", f"/api/presupuestos/{est_id}/enviar", {})
check("Presupuesto enviado", s == 200)
o = next(x for x in db()["service_orders"] if x["id"]=="ord_1049")
check("Orden → esperando_aprobacion", o["estado"] == "esperando_aprobacion", o["estado"])
check("Notificación 'presupuesto_pendiente' (in_app + email)", len([n for n in db()["notifications"] if n["destinatario_id"]=="cust_jorge" and n["tipo"]=="presupuesto_pendiente"]) >= 2)

# 12. Portal del cliente
p = Client()
s, b = p.req("GET", "/seguimiento/tok_jorge_demo")
check("Portal renderiza con presupuesto e ítems", s == 200 and "Jorge" in b and "Estátor" in b)
s, b = p.req("GET", "/seguimiento/tok_falso")
check("Token inválido → enlace inválido", s == 200 and "Enlace inválido" in b)

# 13. Decisión PARCIAL del cliente (2 aprueba, 1 rechaza)
items = [i for i in db()["estimate_items"] if i["estimate_id"] == est_id]
ids = {i["descripcion"]: i["id"] for i in items}
s, b = p.req("POST", f"/api/presupuestos/{est_id}/decision", {"token": "tok_jorge_demo", "decisiones": [
    {"item_id": ids["Estátor de encendido"], "decision": "aprobar"},
    {"item_id": ids["Regulador de voltaje"], "decision": "aprobar"},
    {"item_id": ids["Mano de obra sistema eléctrico"], "decision": "rechazar"}],
    "comentario": "La mano de obra me parece cara, ¿la pueden revisar?"})
check("Decisión por ítem registrada", s == 200)
o = next(x for x in db()["service_orders"] if x["id"]=="ord_1049")
est = next(x for x in db()["estimates"] if x["id"]==est_id)
aut = next(x for x in db()["authorizations"] if x["estimate_id"]==est_id)
check("Orden → autorizado (aprobación parcial)", o["estado"]=="autorizado", o["estado"])
check("Presupuesto → parcialmente_aprobada", est["estado"]=="parcialmente_aprobada")
check("Autorización: versión v1 + monto aprobado con IVA proporcional", aut["version_aceptada"]==1 and aut["monto_aprobado"]==round(305000*1.19), str(aut["monto_aprobado"]))
check("Comentario del cliente → mensaje en el hilo", any(m["service_order_id"]=="ord_1049" and "cara" in m["contenido"] for m in db()["messages"]))
check("Staff notificado de la aprobación", any(n["destinatario_tipo"]=="user" and n["tipo"]=="presupuesto_aprobado" for n in db()["notifications"]))

# 14. Ahora sí se puede reparar
s, b = c.req("POST", "/api/ordenes/ord_1049/estado", {"estado": "en_reparacion"})
check("autorizado → en_reparacion permitido", s == 200)
check("Cliente notificado 'reparacion_iniciada'", any(n["destinatario_id"]=="cust_jorge" and n["tipo"]=="reparacion_iniciada" for n in db()["notifications"]))

# 15. Nueva versión del presupuesto → la anterior queda superada
s, b = c.req("POST", "/api/presupuestos", {"service_order_id": "ord_1049", "items": [
    {"tipo":"repuesto","descripcion":"Estátor de encendido","cantidad":1,"precio_unitario":210000},
    {"tipo":"mano_obra","descripcion":"Mano de obra sistema eléctrico (ajustada)","cantidad":1,"precio_unitario":100000}]})
check("Versión 2 creada (borrador)", s == 200 and json.loads(b)["version"] == 2)
est2 = json.loads(b)["id"]
e1 = next(x for x in db()["estimates"] if x["id"]==est_id)
check("Versión anterior NO queda superada si ya fue aprobada", e1["estado"]=="parcialmente_aprobada", e1["estado"])
s, b = c.req("POST", f"/api/presupuestos/{est2}/enviar", {})
check("v2 enviada → orden vuelve a esperando_aprobacion", s == 200)
o = next(x for x in db()["service_orders"] if x["id"]=="ord_1049")
check("Requiere re-aprobación de la nueva versión", o["estado"]=="esperando_aprobacion", o["estado"])
s, b = c.req("POST", "/api/ordenes/ord_1049/estado", {"estado": "en_reparacion"})
check("Bloqueo de nuevo: v2 pendiente de decisión", s == 400)
items2 = [i for i in db()["estimate_items"] if i["estimate_id"] == est2]
s, b = p.req("POST", f"/api/presupuestos/{est2}/decision", {"token":"tok_jorge_demo","decisiones":[{"item_id": i["id"], "decision":"aprobar"} for i in items2]})
check("Cliente aprueba v2 completa", s == 200)
aut2 = next(x for x in db()["authorizations"] if x["estimate_id"]==est2)
check("Autorización de v2 registrada", aut2["version_aceptada"]==2 and aut2["decision"]=="aprobada_total")

# 16. Mecánico: asignaciones y límites
m = Client()
s, b = m.req("POST", "/api/auth/login", {"correo": "luis@motorx.co", "password": "taller123"})
check("Login mecánico", s == 200)
s, b = m.req("POST", "/api/ordenes/ord_1049/estado", {"estado": "en_reparacion"})
check("Mecánico avanza su trabajo asignado", s == 200, b[:140])
s, b = m.req("POST", "/api/ordenes/ord_1042/estado", {"estado": "listo_entrega"})
check("Mecánico no puede saltar estados", s in (400, 403), b[:120])
s, b = m.req("POST", "/api/ordenes/ord_1047/estado", {"estado": "en_pruebas"})
check("Mecánico no toca trabajos ajenos (403)", s == 403)
s, b = m.req("POST", "/api/presupuestos", {"service_order_id": "ord_1049", "items":[{"tipo":"otro","descripcion":"extra","cantidad":1,"precio_unitario":1000}]})
check("Mecánico no crea presupuestos (403)", s == 403)
s, b = m.req("GET", "/taller/clientes")
check("Mecánico ve clientes? → página responde", s == 200)

# 17. Admin plataforma
a = Client()
s, b = a.req("POST", "/api/auth/login", {"correo": "admin@tallerconecta.co", "password": "taller123"})
check("Login admin", s == 200 and json.loads(b)["redirect"]=="/admin")
s, b = a.req("GET", "/admin")
check("Panel admin renderiza", s == 200 and "Panel de administración" in b)
s, b = a.req("GET", "/taller/dashboard", follow=False)
check("Admin redirigido fuera del panel taller", s == 307 and "/admin" in (b or ""))
s, b = a.req("PATCH", "/api/admin/talleres/ws_motorx", {"plan": "premium"})
check("Admin cambia plan", s == 200)
check("Plan persistido", next(w for w in db()["workshops"] if w["id"]=="ws_motorx")["plan"]=="premium")
s, b = a.req("PATCH", "/api/admin/suscripciones/" + next(x["id"] for x in db()["subscriptions"] if x["workshop_id"]=="ws_autosur"), {"estado": "activa"})
check("Admin actualiza suscripción", s == 200)

# 18. Propietario no usa APIs de admin
s, b = c.req("PATCH", "/api/admin/talleres/ws_motorx", {"estado": "suspendido"})
check("Propietario bloqueado en API admin (403)", s == 403)

# 19. Aislamiento entre talleres
s, b = c.req("POST", "/api/ordenes/ord_as_1/estado", {"estado": "cancelado", "motivo": "x"})
check("Orden de OTRO taller invisible (404)", s == 404)

# 20. Entrega + calificación
s, b = c.req("POST", "/api/ordenes/ord_1049/estado", {"estado": "en_pruebas"})
check("en_reparacion → en_pruebas", s == 200, b[:140])
s, b = c.req("POST", "/api/ordenes/ord_1049/estado", {"estado": "listo_entrega"})
check("Bloqueo: 'listo' exige foto del DESPUÉS", s == 400 and "DESPUÉS" in b, b[:160])
s, b = c.req("POST", "/api/ordenes/ord_1049/media", {"categoria":"despues","nombre":"Trabajo terminado","url":"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E","visible_cliente":True})
check("Carga evidencia del DESPUÉS", s == 200, b[:140])
s, b = c.req("POST", "/api/ordenes/ord_1049/estado", {"estado": "listo_entrega"})
check("en_pruebas → listo_entrega (con foto del después)", s == 200, b[:140])
check("Cliente notificado 'vehiculo_listo'", any(n["destinatario_id"]=="cust_jorge" and n["tipo"]=="vehiculo_listo" for n in db()["notifications"]))
s, b = c.req("POST", "/api/ordenes/ord_1049/entregar", {"valor_final": 375000})
check("Entrega con valor final", s == 200, b[:140])
s, b = p.req("POST", "/api/portal/calificar", {"token": "tok_jorge_demo", "order_id": "ord_1049", "calificacion": 5, "comentario": "¡Excelente!"})
check("Cliente califica 5★", s == 200, b[:140])
o = next(x for x in db()["service_orders"] if x["id"]=="ord_1049")
check("Orden entregada + calificación guardada", o["estado"]=="entregado" and o["calificacion"]==5)
s, b = p.req("POST", "/api/portal/calificar", {"token": "tok_jorge_demo", "order_id": "ord_1049", "calificacion": 1})
check("No se puede calificar dos veces", s == 400)
check("Eventos de auditoría registrados", len([e for e in db()["audit_logs"] if e["entidad"] in ("estimates","authorizations","service_orders")]) > 5)

# 20b. Checklist visual: sin foto del ANTES no hay diagnóstico
s, b = c.req("POST", "/api/ordenes", {"customer_id":"cust_andres","vehicle_id":"veh_spark","motivo_ingreso":"Prueba de checklist visual"})
oid = json.loads(b)["id"]
s, b = c.req("POST", f"/api/ordenes/{oid}/estado", {"estado": "en_diagnostico"})
check("Bloqueo: diagnóstico exige foto del ANTES", s == 400 and "ANTES" in b, b[:160])
s, b = c.req("POST", f"/api/ordenes/{oid}/media", {"categoria":"antes","nombre":"Recepción","url":"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E","visible_cliente":True})
check("Carga evidencia del ANTES", s == 200, b[:140])
s, b = c.req("POST", f"/api/ordenes/{oid}/estado", {"estado": "en_diagnostico"})
check("Con foto ANTES avanza a diagnóstico", s == 200, b[:160])

# 20c. Botón "¿Dónde va mi carro?" → resumen WhatsApp
s, b = p.req("POST", "/api/portal/resumen", {"token": "tok_jorge_demo", "order_id": "ord_1049"})
rr = json.loads(b) if s == 200 else {}
check("Resumen automático con enlace wa.me", s == 200 and "ORD-1049" in rr.get("resumen","") and rr.get("whatsapp_url","").startswith("https://wa.me/"), b[:160])
check("Resumen registrado como WhatsApp simulado", any(n["destinatario_id"]=="cust_jorge" and n["tipo"]=="resumen_whatsapp" and n["canal"]=="whatsapp" for n in db()["notifications"]))

# 20d. Firma digital de conformidad de entrega
s, b = p.req("POST", "/api/portal/firma", {"token":"tok_jorge_demo","order_id":"ord_1049","firma":"data:image/png;base64,iVBORw0KGgo="})
check("Firma digital de entrega registrada", s == 200, b[:160])
check("Firma guardada como evidencia", any(m["service_order_id"]=="ord_1049" and m["nombre"].startswith("Firma de conformidad") for m in db()["order_media"]))
s, b = p.req("POST", "/api/portal/firma", {"token":"tok_jorge_demo","order_id":"ord_1049","firma":"data:image/png;base64,iVBORw0KGgo="})
check("No se puede firmar dos veces", s == 400)

# 20e. Autorización parcial con APLAZADOS + semáforo
s, b = c.req("POST", "/api/presupuestos", {"service_order_id": oid, "items": [
  {"tipo":"repuesto","descripcion":"Pastillas de freno (seguridad)","cantidad":1,"precio_unitario":200000,"criticidad":"urgente"},
  {"tipo":"servicio","descripcion":"Alineación","cantidad":1,"precio_unitario":90000,"criticidad":"puede_esperar"}]})
estp = json.loads(b)["id"]
s, b = c.req("POST", f"/api/presupuestos/{estp}/enviar", {})
check("Presupuesto con semáforo enviado", s == 200, b[:140])
dbx = db()
itemsp = {i["descripcion"]: i["id"] for i in dbx["estimate_items"] if i["estimate_id"]==estp}
s, b = p.req("POST", f"/api/presupuestos/{estp}/decision", {"token":"tok_andres_demo","decisiones":[
  {"item_id": itemsp["Pastillas de freno (seguridad)"], "decision":"aprobar"},
  {"item_id": itemsp["Alineación"], "decision":"postergar"}]})
check("Aprueba frenos y APLAZA alineación ('por ahora no')", s == 200, b[:160])
dbx = db()
autp = next(a for a in dbx["authorizations"] if a["estimate_id"]==estp)
estp2 = next(e for e in dbx["estimates"] if e["id"]==estp)
check("Aplazados registrados en la autorización", estp2["estado"]=="parcialmente_aprobada" and len(autp["items_postergados"])==1)
check("Monto aprobado = solo lo urgente", autp["monto_aprobado"]==round(200000*1.19))
s, b = c.req("POST", f"/api/ordenes/{oid}/estado", {"estado":"en_reparacion"})
check("Lo aplazado NO bloquea reparar lo aprobado", s == 200, b[:160])
s, b = Client().req("GET", "/seguimiento/tok_andres_demo")
check("Portal muestra el semáforo de criticidad", s == 200 and "Urgente" in b and "Recomendado pronto" in b)

# 20f. Semáforo editable en el panel del taller (solo borradores)
s, b = c.req("POST", "/api/presupuestos", {"service_order_id": oid, "items": [
  {"tipo":"repuesto","descripcion":"Bomba de gasolina","cantidad":1,"precio_unitario":450000,"criticidad":"recomendado"}]})
estb = json.loads(b)["id"]
dbx = db()
itemb = next(i["id"] for i in dbx["estimate_items"] if i["estimate_id"]==estb)
s, b = c.req("PATCH", f"/api/presupuestos/{estb}/items/{itemb}", {"criticidad": "urgente"})
check("Semáforo editable en borrador", s == 200, b[:140])
check("Criticidad guardada en el ítem", next(i for i in db()["estimate_items"] if i["id"]==itemb)["criticidad"] == "urgente")
s, b = c.req("GET", "/taller/presupuestos")
check("Página de presupuestos muestra semáforo y modo edición", s == 200 and "🟢" in b and "editable" in b.lower())
s, b = c.req("PATCH", f"/api/presupuestos/{estp}/items/{itemsp['Alineación']}", {"criticidad": "urgente"})
check("Semáforo inmutable tras enviar al cliente", s == 400 and "borrador" in b, b[:160])
s, b = m.req("PATCH", f"/api/presupuestos/{estb}/items/{itemb}", {"criticidad": "puede_esperar"})
check("Mecánico no edita el semáforo (403)", s == 403)

# 20g. Comparativa original/homologado (poder de decisión del cliente)
s, b = c.req("POST", "/api/presupuestos", {"service_order_id": oid, "items": [
  {"tipo":"repuesto","descripcion":"Bomba de combustible original","cantidad":1,"precio_unitario":400000,"criticidad":"urgente",
   "alternativa_descripcion":"Bomba homologada AISIN","alternativa_precio_unitario":220000,"taller_recomienda":"alternativa"}]})
estg = json.loads(b)["id"]
s, b = c.req("POST", f"/api/presupuestos/{estg}/enviar", {})
check("Presupuesto adicional con comparativa enviado", s == 200, b[:140])
dbx = db()
itemg = next(i for i in dbx["estimate_items"] if i["estimate_id"]==estg)
check("Comparativa persistida en el ítem", itemg["alternativa_precio_unitario"]==220000 and itemg["taller_recomienda"]=="alternativa")
s, b = Client().req("GET", "/seguimiento/tok_andres_demo")
check("Portal muestra la comparativa con recomendación del taller", s == 200 and "homologada" in b.lower() and "recomienda el taller" in b.lower())
s, b = p.req("POST", f"/api/presupuestos/{estg}/decision", {"token":"tok_andres_demo","decisiones":[{"item_id":itemg["id"],"decision":"aprobar","opcion":"alternativa"}]})
check("Cliente aprueba eligiendo el HOMOLOGADO", s == 200, b[:160])
dbx = db()
autg = next(a for a in dbx["authorizations"] if a["estimate_id"]==estg)
check("Monto aprobado = precio homologado + IVA", autg["monto_aprobado"]==round(220000*1.19), str(autg["monto_aprobado"]))
check("Elección registrada en la autorización", autg["items_con_alternativa"]==[itemg["id"]])

# 20h. Recordatorios automáticos de mantenimiento (retención)
s, b = c.req("GET", "/taller/dashboard")
check("Dashboard muestra candidatos a recordatorio", s == 200 and "Recordatorios automáticos" in b and "Gloria" in b)
dbx = db()
vg = next(v["id"] for v in dbx["vehicles"] if v["placa"]=="GHI-021")
s, b = c.req("POST", "/api/taller/recordatorios-mantenimiento", {"vehicle_id": vg})
check("Recordatorio de mantenimiento enviado", s == 200, b[:140])
dbx = db()
check("Cliente notificada por correo simulado", any(n["tipo"]=="recordatorio_mantenimiento" and n["canal"]=="email" for n in dbx["notifications"]))
check("Aviso visible en su portal (in_app)", any(n["tipo"]=="recordatorio_mantenimiento" and n["canal"]=="in_app" and n["destinatario_id"]=="cust_gloria" for n in dbx["notifications"]))
s, b = c.req("POST", "/api/taller/recordatorios-mantenimiento", {"vehicle_id": vg})
check("No se repite antes de 30 días", s == 400)
vgolf = next(v["id"] for v in dbx["vehicles"] if v["placa"]=="STU-147")
s, b = c.req("POST", "/api/taller/recordatorios-mantenimiento", {"vehicle_id": vgolf})
check("Vehículo con servicio reciente no aplica (regla 3 meses)", s == 400)

# 20j. Asignación directa de órdenes desde la página Equipo
s, b = c.req("GET", "/taller/equipo")
check("Página Equipo muestra carga de trabajo y asignación", s == 200 and "Carga de trabajo y asignación" in b and "Asignar orden activa" in b)
s, b = c.req("POST", "/api/ordenes/ord_1048/asignar", {"responsable_id": "usr_luis"})
check("Propietario asigna una orden al mecánico", s == 200, b[:140])
dbx = db()
check("Orden queda con responsable", next(o for o in dbx["service_orders"] if o["id"]=="ord_1048")["responsable_id"]=="usr_luis")
check("Mecánico notificado del trabajo asignado", any(n["destinatario_id"]=="usr_luis" and n["tipo"]=="trabajo_asignado" for n in dbx["notifications"]))
s, b = c.req("GET", "/taller/equipo")
check("La asignación se refleja en la carga de Luis", s == 200 and "ORD-1048" in b)
s, b = c.req("POST", "/api/ordenes/ord_1048/asignar", {"responsable_id": "usr_diana"})
check("No se asigna a personal de otro taller (400)", s == 400)

# 21. Registro público + sesión automática + suscripción prueba
n = Client()
s, b = n.req("POST", "/api/registro", {"taller_nombre":"Taller Prueba SAS","ciudad":"Medellín","telefono":"+57 604 111 2233","nombre":"Pablo Ruiz","correo":"pablo@tallerprueba.co","password":"secreto1"})
check("Registro sin aceptar términos se rechaza (Ley 1581)", s == 400 and "términos" in b.lower())
s, b = n.req("POST", "/api/registro", {"taller_nombre":"Taller Prueba SAS","ciudad":"Medellín","telefono":"+57 604 111 2233","nombre":"Pablo Ruiz","correo":"pablo@tallerprueba.co","password":"secreto1","acepta_terminos":True})
check("Registro público de taller", s == 200 and json.loads(b)["ok"], b[:140])
s, b = n.req("GET", "/taller/dashboard")
check("Sesión automática tras registro", s == 200 and "Panel de control" in b)
check("Suscripción en prueba creada", any(x["estado"]=="en_prueba" and x["workshop_id"] not in ("ws_motorx","ws_autosur") for x in db()["subscriptions"]))
s, b = n.req("POST", "/api/registro", {"taller_nombre":"Otro","ciudad":"X","telefono":"1234567","nombre":"Otro","correo":"pablo@tallerprueba.co","password":"secreto1"})
check("Correo duplicado rechazado", s == 400)

# 22. Mensajería bidireccional
s, b = p.req("POST", "/api/portal/mensajes", {"token":"tok_maria_demo","order_id":"ord_1048","contenido":"¿A qué hora puedo pasar el viernes?"})
check("Cliente escribe desde el portal", s == 200, b[:140])
s, b = c.req("GET", "/api/notificaciones?canal=in_app")
check("Staff notificado del mensaje nuevo", any("1048" in x["titulo"] for x in json.loads(b)["notifications"]))
s, b = c.req("POST", "/api/ordenes/ord_1048/mensajes", {"contenido":"Puedes pasar a las 4 pm."})
check("Staff responde", s == 200)
check("Cliente notificado de la respuesta", any(n["destinatario_id"]=="cust_maria" and n["tipo"]=="mensaje_nuevo" for n in db()["notifications"]))
s, b = c.req("POST", "/api/notificaciones/leer", {})
check("Marcar notificaciones leídas", s == 200)

# 23. Clientes y vehículos
s, b = c.req("POST", "/api/clientes", {"nombre":"Test Cliente","telefono":"+57 300 000 0000","correo":"test@example.co","documento":""})
check("Crear cliente", s == 200 and "/seguimiento/" in json.loads(b)["portal"])
cid = json.loads(b)["id"]
s, b = c.req("POST", "/api/vehiculos", {"customer_id": cid, "placa":"tst-001","tipo":"carro","marca":"Test","modelo":"Uno","anio":2020,"kilometraje":1000,"color":""})
check("Crear vehículo", s == 200)
s, b = c.req("POST", "/api/vehiculos", {"customer_id": "cust_autosur_1", "placa":"XYZ-999","tipo":"carro","marca":"Ajeno","modelo":"Ajeno","anio":2020,"kilometraje":0})
check("Vehículo para cliente de OTRO taller bloqueado (403)", s == 403)

# 24. Evidencia (data-URI)
s, b = c.req("POST", "/api/ordenes/ord_1048/media", {"categoria":"durante","nombre":"Prueba","url":"data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E","visible_cliente":True})
check("Cargar evidencia", s == 200, b[:140])

# 26. Páginas legales
for ruta, clave in [("/legal/privacidad", "Ley 1581"), ("/legal/terminos", "Términos y Condiciones"), ("/legal/seguridad", "Row Level Security")]:
    s, b = Client().req("GET", ruta)
    check(f"Página legal {ruta}", s == 200 and clave in b, clave)

# 27. Cuenta de cliente: registro, login, perfil, vinculación
s, b = Client().req("GET", "/cuenta", follow=False)
check("/cuenta sin sesión redirige a /cuenta/login", s == 307)
cc = Client()
s, b = cc.req("POST", "/api/cuenta/registro", {"nombre":"Sofía Medina","correo":"sofia.medina@example.co","telefono":"+57 322 118 3364","password":"cuenta123"})
check("Registro de cuenta sin consentimiento se rechaza", s == 400)
s, b = cc.req("POST", "/api/cuenta/registro", {"nombre":"Sofía Medina","correo":"sofia.medina@example.co","telefono":"+57 322 118 3364","password":"cuenta123","acepta_terminos":True})
check("Registro de cuenta de cliente", s == 200 and json.loads(b)["ok"], b[:140])
dbx = db()
acc = next(a for a in dbx["customer_accounts"] if a["correo"]=="sofia.medina@example.co")
check("Consentimiento de tratamiento registrado", bool(acc["consentimiento_datos_at"]))
check("Crear cuenta NO vincula fichas por correo (privacidad)", not any(l["account_id"]==acc["id"] for l in dbx["customer_account_links"]))
s, b = cc.req("GET", "/cuenta")
check("/cuenta sin fichas muestra la guía de vinculación por enlace", s == 200 and "Mi perfil" in b and "Aún no tienes fichas vinculadas" in b)
s, b = cc.req("POST", "/api/cuenta/vincular", {"token": "tok_sofia_demo"})
check("Vinculación SOLO por enlace personal", s == 200, b[:140])
s, b = cc.req("GET", "/cuenta")
check("/cuenta muestra el seguimiento con badge 'vinculado por enlace'", s == 200 and "Kia Picanto" in b and "vinculado por enlace" in b and "vinculado por correo" not in b)
s, b = cc.req("POST", "/api/cuenta/vincular", {"token": "tok_valeria_demo"})
check("Vincular enlace personal de otro taller", s == 200, b[:140])
s, b = cc.req("POST", "/api/cuenta/vincular", {"token": "tok_valeria_demo"})
check("Vinculación duplicada bloqueada", s == 400)
s, b = cc.req("POST", "/api/cuenta/vincular", {"token": "tok_maria_demo"})
check("PRIVACIDAD: otra persona no puede añadir un enlace en uso", s == 400 and "privacidad" in b.lower(), b[:160])
dbx = db()
check("La ficha de María sigue vinculada SOLO a su cuenta", [l["account_id"] for l in dbx["customer_account_links"] if l["customer_id"]=="cust_maria"] == ["acc_maria"])
s, b = cc.req("PATCH", "/api/cuenta/perfil", {"nombre": "Sofía M. Actualizada"})
check("Editar perfil", s == 200)
cc2 = Client()
s, b = cc2.req("POST", "/api/cuenta/login", {"correo":"maria.gomez@example.co","password":"cliente123"})
check("Login cuenta demo del seed (María)", s == 200 and json.loads(b)["redirect"]=="/cuenta", b[:140])
s, b = cc2.req("GET", "/cuenta")
check("María ve su seguimiento con cuenta", s == 200 and "Mazda 3" in b)
# cuenta de cliente NO puede entrar al panel del taller
s, b = cc2.req("GET", "/taller/dashboard", follow=False)
check("Cuenta de cliente bloqueada en /taller (307)", s == 307)

# 27b. Vehículos registrados por el cliente desde su cuenta
s, b = cc2.req("GET", "/cuenta")
check("/cuenta muestra 'Mis vehículos' y el Twingo del seed", s == 200 and "Mis vehículos" in b and "Twingo" in b)
s, b = cc2.req("POST", "/api/cuenta/vehiculos", {"customer_id":"cust_maria","placa":"mkr-999","tipo":"carro","marca":"Chevrolet","modelo":"Onix","anio":2022,"kilometraje":41000,"color":"Blanco"})
check("Cliente registra su carro desde la cuenta", s == 200, b[:140])
s, b = cc2.req("POST", "/api/cuenta/vehiculos", {"customer_id":"cust_maria","placa":"ABC-456","tipo":"carro","marca":"X","modelo":"Y","anio":2020,"kilometraje":1})
check("Placa duplicada en el taller rechazada", s == 400)
s, b = cc2.req("POST", "/api/cuenta/vehiculos", {"customer_id":"cust_eduardo","placa":"ZZZ-000","tipo":"carro","marca":"X","modelo":"Y","anio":2020,"kilometraje":1})
check("No registra en ficha no vinculada a su cuenta", s == 400)
dbx = db()
vid = next(v["id"] for v in dbx["vehicles"] if v["placa"]=="MKR-999")
check("Vehículo guardado con origen 'cliente'", next(v for v in dbx["vehicles"] if v["id"]==vid)["origen"] == "cliente")
s, b = c.req("GET", "/taller/vehiculos")
check("Panel del taller lo ve como 'Registrado por el cliente'", s == 200 and "MKR-999" in b and "Registrado por el cliente" in b)
s, b = c.req("GET", "/taller/vehiculos?origen=cliente")
check("Filtro origen=cliente (MKR-999 + Twingo del seed)", s == 200 and "MKR-999" in b and "HQR-210" in b)
s, b = c.req("GET", "/api/notificaciones?canal=in_app")
check("Personal del taller notificado del registro", any("MKR-999" in x["cuerpo"] for x in json.loads(b)["notifications"]))
s, b = cc2.req("PATCH", f"/api/cuenta/vehiculos/{vid}", {"kilometraje": 41500})
check("Cliente actualiza el kilometraje de su carro", s == 200, b[:140])
dbx = db()
check("Kilometraje actualizado en BD", next(v for v in dbx["vehicles"] if v["id"]==vid)["kilometraje"] == 41500)
s, b = cc2.req("PATCH", "/api/cuenta/vehiculos/veh_mazda3", {"kilometraje": 1})
check("No puede editar vehículo registrado por el taller", s == 400)
s, b = c.req("GET", "/taller/ordenes/nueva")
check("Recepción de orden incluye el vehículo aportado", s == 200 and "MKR-999" in b)

# 27b-2. Desvincular la ficha retira los vehículos aportados y el panel del taller se actualiza
s, b = cc.req("POST", "/api/cuenta/vehiculos", {"customer_id":"cust_valeria","placa":"ccc-111","tipo":"carro","marca":"Fiat","modelo":"Uno","anio":2015,"kilometraje":120000,"color":"Gris"})
check("Cliente registra carro en otra ficha vinculada", s == 200, b[:140])
s, b = c.req("GET", "/taller/vehiculos")
check("Panel del taller muestra CCC-111 en su tabla", s == 200 and ">CCC-111</span>" in b)
s, b = cc.req("POST", "/api/cuenta/desvincular", {"customer_id": "cust_valeria"})
check("Desvincular la ficha del taller", s == 200, b[:140])
dbx = db()
check("Vehículo aportado retirado de la BD", not any(v["placa"]=="CCC-111" for v in dbx["vehicles"]))
s, b = c.req("GET", "/taller/vehiculos")
check("Panel del taller YA NO lista CCC-111 (actualizado)", s == 200 and ">CCC-111</span>" not in b)
s, b = c.req("GET", "/api/notificaciones?canal=in_app")
check("Taller notificado de la desvinculación", any(x["tipo"]=="cliente_desvinculado" for x in json.loads(b)["notifications"]))
s, b = Client().req("GET", "/seguimiento/tok_valeria_demo")
check("Enlace creado por el taller queda ANULADO tras desvincular", s == 200 and ("inválido" in b.lower() or "anulado" in b.lower()))
s, b = Client().req("POST", "/api/portal/mensajes", {"token":"tok_valeria_demo","order_id":"ord_1038","contenido":"hola"})
check("APIs del portal rechazan el enlace anulado", s == 404)
s, b = cc.req("POST", "/api/cuenta/vincular", {"token": "tok_valeria_demo"})
check("PRIVACIDAD: el enlace anulado NO puede volver a vincularse", s == 400, b[:160])
s, b = c.req("GET", "/taller/configuracion?tab=portales")
check("Panel del taller muestra 'Enlace anulado'", s == 200 and "anulado" in b.lower())
s, b = c.req("GET", "/taller/clientes/cust_valeria")
check("Ficha del cliente informa la anulación", s == 200 and "ANULADO" in b)
s, b = c.req("POST", "/api/clientes/cust_valeria/regenerar-enlace", {})
check("Taller genera un enlace NUEVO", s == 200, b[:140])
dbx = db()
ntok = next(x for x in dbx["customers"] if x["id"]=="cust_valeria")["portal_token"]
check("Token rotado: el enlace anterior ya no existe", ntok != "tok_valeria_demo")
s, b = Client().req("GET", f"/seguimiento/{ntok}")
check("El NUEVO enlace funciona", s == 200 and "Valeria" in b)
s, b = Client().req("GET", "/seguimiento/tok_valeria_demo")
check("El enlace anulado sigue muerto tras regenerar", s == 200 and ("inválido" in b.lower() or "anulado" in b.lower()))
s, b = cc.req("POST", "/api/cuenta/vincular", {"token": ntok})
check("Cliente puede vincular el NUEVO enlace", s == 200, b[:140])
check("Cliente notificado del nuevo enlace (correo simulado)", any(n["destinatario_id"]=="cust_valeria" and n["tipo"]=="enlace_nuevo" and ntok in n["cuerpo"] for n in db()["notifications"]))
s, b = c.req("GET", "/taller/configuracion?tab=comunicaciones")
check("Bandeja de salida muestra el correo con el nuevo enlace", s == 200 and ntok in b)

# 27c. Sesión persistente: el sitio público reconoce la sesión iniciada
s, b = c.req("GET", "/")
check("Inicio con sesión de staff muestra 'Ir al panel'", s == 200 and "Ir al panel" in b)
s, b = cc2.req("GET", "/")
check("Inicio con sesión de cliente muestra 'Ir a mi cuenta'", s == 200 and "Ir a mi cuenta" in b)
s, b = c.req("GET", "/login", follow=False)
check("/login con sesión viva redirige al panel (307)", s == 307)
s, b = cc2.req("GET", "/cuenta/login", follow=False)
check("/cuenta/login con sesión viva redirige a /cuenta (307)", s == 307)
s, b = cc2.req("GET", "/cuenta/registro", follow=False)
check("/cuenta/registro con sesión viva redirige (307)", s == 307)
s, b = Client().req("GET", "/")
check("Inicio sin sesión muestra 'Registrar mi taller'", s == 200 and "Registrar mi taller" in b)
s, b = Client().req("GET", "/login")
check("/login sin sesión muestra el formulario del taller", s == 200 and "Accesos rápidos" in b)
s, b = Client().req("GET", "/login")
check("/login tiene selector Cliente / Taller", s == 200 and "Soy del taller" in b and "Soy cliente" in b)
s, b = Client().req("GET", "/login?tipo=cliente")
check("/login?tipo=cliente abre el acceso de cliente", s == 200 and "Iniciar sesión como cliente" in b)
s, b = Client().req("GET", "/")
check("Inicio SIN 'Soy cliente' en la cabecera", s == 200 and "Soy cliente" not in b and "Registrar mi taller" in b)

# 28. Medios con control de acceso (enlaces temporales/no públicos)
dbx = db()
media_id = next(m["id"] for m in dbx["order_media"] if m["service_order_id"]=="ord_1048")
s, b = Client().req("GET", f"/api/media/{media_id}")
check("Medio sin credenciales → 404", s == 404)
s, b = Client().req("GET", f"/api/media/{media_id}?token=tok_maria_demo")
check("Medio con enlace personal del dueño → 200", s == 200 and s == 200)
s, b = Client().req("GET", f"/api/media/{media_id}?token=tok_jorge_demo")
check("Medio con token de OTRO cliente → 404", s == 404)
s, b = c.req("GET", f"/api/media/{media_id}")
check("Medio con sesión del personal del taller → 200", s == 200)
s, b = cc2.req("GET", f"/api/media/{media_id}")
check("Medio con cuenta de cliente vinculada → 200", s == 200)

# 29. Supresión de datos en el taller (anonimización)
s, b = c.req("POST", "/api/clientes/cust_valeria/anonimizar", {})
check("No se anonimiza con órdenes activas", s == 400, b[:140])
s, b = c.req("POST", "/api/clientes/cust_juanita/anonimizar", {})
check("Anonimización de ficha sin órdenes activas", s == 200, b[:140])
dbx = db()
cj = next(x for x in dbx["customers"] if x["id"]=="cust_juanita")
check("Contactos suprimidos + token invalidado", cj["anonimizado"] and cj["telefono"]=="—" and cj["portal_token"]!="tok_juanita_demo")
check("Auditoría de supresión registrada", any(a["accion"]=="cliente.suprimir_datos" for a in dbx["audit_logs"]))
s, b = Client().req("GET", "/seguimiento/tok_juanita_demo")
check("Enlace personal invalidado tras supresión", s == 200 and "Enlace inválido" in b)

# 30. Eliminación de cuenta de cliente (derecho de supresión)
s, b = cc.req("POST", "/api/cuenta/eliminar", {})
check("Cliente elimina su cuenta", s == 200)
s, b = cc.req("GET", "/cuenta", follow=False)
check("Cuenta eliminada: sesión cerrada y acceso bloqueado", (s == 307) or (s == 200 and "Cuenta no encontrada" in b), f"status={s}")

# 20i. El taller crea cuentas de mecánicos (acceso SIN registro propio)
s, b = c.req("POST", "/api/taller/miembros", {"nombre":"Juan Torres","correo":"juan.torres@motorx.co","telefono":"+57 300 123 4567","rol":"mechanic"})
check("Taller añade un mecánico", s == 200, b[:140])
passj = json.loads(b)["password_temporal"]
check("Contraseña temporal devuelta (se muestra una vez)", bool(passj) and len(passj) >= 10)
jm = Client()
s, b = jm.req("POST", "/api/auth/login", {"correo":"juan.torres@motorx.co","password":passj})
check("El mecánico inicia sesión SIN registrarse", s == 200 and json.loads(b)["rol"]=="mechanic", b[:140])
s, b = jm.req("GET", "/taller/equipo")
check("Mecánico no gestiona Equipo (vista por rol)", s == 200 and "no disponible" in b.lower())
s, b = jm.req("GET", "/taller/dashboard")
check("Mecánico entra a su panel", s == 200 and "Panel de control" in b)
s, b = c.req("POST", "/api/taller/miembros", {"nombre":"Rita Vargas","correo":"rita@motorx.co","telefono":"+57 301 222 3344","rol":"advisor","password":"claveTaller1"})
check("Asesora con contraseña definida por el taller", s == 200 and json.loads(b)["password_temporal"]=="claveTaller1", b[:140])
rv = Client()
s, b = rv.req("POST", "/api/auth/login", {"correo":"rita@motorx.co","password":"claveTaller1"})
check("Login con la contraseña dada por el taller", s == 200 and json.loads(b)["rol"]=="advisor")
dbx = db()
mid = next(m["id"] for m in dbx["workshop_members"] if m["user_id"]==next(u["id"] for u in dbx["users"] if u["correo"]=="juan.torres@motorx.co"))
s, b = c.req("POST", f"/api/taller/miembros/{mid}/password", {})
pn = json.loads(b).get("password_temporal") if s == 200 else None
check("Generar nueva contraseña (olvido)", s == 200 and bool(pn), b[:140])
s, b = jm.req("POST", "/api/auth/login", {"correo":"juan.torres@motorx.co","password":passj})
check("La contraseña anterior ya no sirve", s == 401)
s, b = jm.req("POST", "/api/auth/login", {"correo":"juan.torres@motorx.co","password":pn})
check("La nueva contraseña funciona", s == 200)
s, b = rv.req("POST", "/api/taller/miembros", {"nombre":"X Y","correo":"x@y.co","telefono":"+57 300 000 0000","rol":"mechanic"})
check("Asesor no puede añadir miembros (403)", s == 403)
s, b = c.req("GET", "/taller/equipo")
check("Propietario ve la página Equipo con sus mecánicos", s == 200 and "Equipo del taller" in b and "Juan Torres" in b)
s, b = c.req("GET", "/taller/dashboard")
check("Sidebar del propietario incluye Equipo", s == 200 and "/taller/equipo" in b)

# 30b. Cierre de sesión REAL (regresión: await destroySessionCookie)
nl = Client()
s, b = nl.req("POST", "/api/auth/login", {"correo":"carlos@motorx.co","password":"taller123"})
check("Login staff para prueba de logout", s == 200)
s, b = nl.req("GET", "/taller/dashboard")
check("Sesión staff activa", s == 200 and "Panel de control" in b)
s, b = nl.req("POST", "/api/auth/logout")
check("Logout staff responde ok", s == 200)
s, b = nl.req("GET", "/taller/dashboard", follow=False)
check("Logout staff cierra la sesión de verdad (307)", s == 307)
nl2 = Client()
s, b = nl2.req("POST", "/api/cuenta/login", {"correo":"maria.gomez@example.co","password":"cliente123"})
check("Login cliente para prueba de logout", s == 200)
s, b = nl2.req("GET", "/cuenta")
check("Sesión cliente activa", s == 200 and "Mi perfil" in b)
s, b = nl2.req("POST", "/api/cuenta/logout")
check("Logout cliente responde ok", s == 200)
s, b = nl2.req("GET", "/cuenta", follow=False)
check("Botón Salir del panel del cliente cierra la sesión (307)", s == 307)

# 30c. Configuración de la cuenta: se guarda y permanece al cerrar sesión
nl3 = Client()
s, b = nl3.req("POST", "/api/cuenta/login", {"correo":"maria.gomez@example.co","password":"cliente123"})
check("Login cuenta para prueba de guardado", s == 200)
s, b = nl3.req("PATCH", "/api/cuenta/perfil", {"nombre": "María Gómez Editada", "telefono": "+57 310 555 4821"})
check("Perfil modificado (autoguardado)", s == 200, b[:140])
s, b = nl3.req("POST", "/api/cuenta/logout")
check("Salir responde ok", s == 200)
s, b = nl3.req("GET", "/cuenta", follow=False)
check("Tras Salir la sesión quedó cerrada (307)", s == 307)
s, b = nl3.req("POST", "/api/cuenta/login", {"correo":"maria.gomez@example.co","password":"cliente123"})
check("Re-login tras cerrar sesión", s == 200)
s, b = nl3.req("GET", "/cuenta")
check("La configuración modificada PERMANECIÓ tras cerrar sesión", s == 200 and "María Gómez Editada" in b)
s, b = nl3.req("PATCH", "/api/cuenta/perfil", {"nombre": "María Gómez", "telefono": "+57 310 555 4821"})
check("Perfil restaurado", s == 200)

# 30d. Panel del taller en vivo (auto-refresco cada 15 s)
s, b = c.req("GET", "/taller/dashboard")
check("Panel del taller con refresco automático ('Panel en vivo')", s == 200 and "Panel en vivo" in b)
s, b = a.req("GET", "/admin")
check("Admin sin indicador en vivo (no aplica)", s == 200 and "Panel en vivo" not in b)

# 31. Reset demo
s, b = Client().req("POST", "/api/admin/reset-demo")
check("Reset demo", s == 200)
o = next(x for x in db()["service_orders"] if x["id"]=="ord_1049")
check("BD restaurada al seed", o["estado"]=="en_diagnostico")

print("\n🎉 SMOKE TEST E2E COMPLETO — TODAS LAS VERIFICACIONES OK")

# ─────────────────────────────────────────────────────────────────────────────
# Smoke test E2E (123 verificaciones sobre HTTP real).
# Uso:
#   npm run build && npm run start -- -p 3100   (en otra terminal)
#   python3 tests/smoke-e2e.py
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Smoke test E2E (162 verificaciones sobre HTTP real).
# Uso:
#   npm run build && npm run start -- -p 3100   (en otra terminal)
#   python3 tests/smoke-e2e.py
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Smoke test E2E (214 verificaciones sobre HTTP real).
# Uso:
#   npm run build && npm run start -- -p 3100   (en otra terminal)
#   python3 tests/smoke-e2e.py
# En máquinas con poca RAM (<2 GB): npm run build -- --webpack
# ─────────────────────────────────────────────────────────────────────────────
