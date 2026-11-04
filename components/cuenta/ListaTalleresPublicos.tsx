"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, MapPin, Phone, Clock, AlertCircle, CheckCircle, Building2, Key, ExternalLink, Wrench } from "lucide-react";
import { Button, Badge, Card, CardHeader, CardBody, Alert } from "@/components/ui";
import { Accordion } from "@/components/ui";
import Image from "next/image";
import type { Workshop } from "@/lib/database/types";
import { api } from "@/lib/api-client";

/** Lista de talleres públicos. Cada tarjeta es un botón completo que navega a la página de perfil del taller. */
export function ListaTalleresPublicos({
  talleres,
  vinculaciones = {},
}: {
  talleres: Workshop[];
  vinculaciones?: Record<string, "pendiente" | "aceptado" | "rechazado">;
}) {
  const router = useRouter();
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [vincError, setVincError] = useState<Record<string, string>>({});
  const [vincMsg, setVincMsg] = useState<Record<string, string>>({});
  const [vincEstadoLocal, setVincEstadoLocal] = useState<Record<string, "pendiente" | "aceptado">>({});
  const TALLERES_POR_DEFECTO = 3;
  const visibles = mostrarTodos ? talleres : talleres.slice(0, TALLERES_POR_DEFECTO);
  const hayMas = talleres.length > TALLERES_POR_DEFECTO && !mostrarTodos;

  if (talleres.length === 0) {
    return (
      <Accordion title="Ver Lista de Talleres Registrados" defaultOpen={true}>
        <Card className="border-dashed border-slate-300 bg-slate-50/50">
          <CardBody className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900">No hay talleres registrados todavía</h4>
            <p className="mt-2 text-sm text-slate-500">Cuando haya talleres disponibles, aparecerán aquí para que puedas vincularte.</p>
          </CardBody>
        </Card>
      </Accordion>
    );
  }

  async function vincularConPublico(workshopId: string) {
    const w = talleres.find((t) => t.id === workshopId);
    const enlace = w?.enlace_publico;
    if (!enlace) {
      setVincError((prev) => ({ ...prev, [workshopId]: "Este taller no tiene enlace público configurado." }));
      return;
    }
    setVinculando(workshopId);
    setVincError((prev) => { const next = { ...prev }; delete next[workshopId]; return next; });
    setVincMsg((prev) => { const next = { ...prev }; delete next[workshopId]; return next; });
    try {
      await api.post("/api/cuenta/vincular-publico", { enlace_publico: enlace });
      setVincEstadoLocal((prev) => ({ ...prev, [workshopId]: "pendiente" }));
      setVincMsg((prev) => ({ ...prev, [workshopId]: "Solicitud de vinculación enviada ✓" }));
      setTimeout(() => {
        setVincMsg((prev) => { const next = { ...prev }; delete next[workshopId]; return next; });
        setVinculando(null);
      }, 1000);
      router.refresh();
    } catch (err) {
      setVincError((prev) => ({ ...prev, [workshopId]: err instanceof Error ? err.message : "No se pudo vincular." }));
      setVinculando(null);
    }
  }

  async function cancelarVinculacion(workshopId: string) {
    if (!confirm("¿Cancelar la solicitud de vinculación con este taller?")) return;
    setCancelando(workshopId);
    setVincError((prev) => { const next = { ...prev }; delete next[workshopId]; return next; });
    try {
      await api.post("/api/cuenta/cancelar-vinculacion", { workshop_id: workshopId });
      setVincEstadoLocal((prev) => {
        const next = { ...prev };
        delete next[workshopId];
        return next;
      });
      setVincMsg((prev) => ({ ...prev, [workshopId]: "Solicitud de vinculación cancelada ✓" }));
      setTimeout(() => {
        setVincMsg((prev) => { const next = { ...prev }; delete next[workshopId]; return next; });
        router.refresh();
      }, 1500);
    } catch (err) {
      setVincError((prev) => ({ ...prev, [workshopId]: err instanceof Error ? err.message : "No se pudo cancelar la solicitud." }));
    } finally {
      setCancelando(null);
    }
  }

  return (
    <>
      <Accordion title="Otros talleres en la red" defaultOpen={true} alwaysOpen={true} icon={<Building2 className="h-5 w-5 text-emerald-600" />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((w) => {
            const wTienePublico = Boolean(w.enlace_publico);
            const wEstadoServidor = vinculaciones?.[w.id];
            const wEstadoLocal = vincEstadoLocal[w.id];
            const wEstado = wEstadoLocal ?? wEstadoServidor;
            const wEstaPendiente = wEstado === "pendiente";
            const wEstaAceptado = wEstado === "aceptado";
            const wYaVinculado = vinculando === w.id || wEstaAceptado;
            const tieneCupos = w.cupos_disponibles != null && w.cupos_disponibles > 0;
            const noDisponible = w.cupos_disponibles === 0;
            const canNavigate = !wEstaPendiente && !wEstaAceptado;

return (
              <div
                key={w.id}
                onClick={canNavigate ? () => router.push(`/cuenta/taller/${w.id}`) : undefined}
                style={{ cursor: canNavigate ? 'pointer' : 'default' }}
              >
                <Card className="panel h-full flex flex-col group transition-all duration-200 hover:shadow-lg">
                  {/* Custom header with logo and status badges */}
                  <div className="flex items-start gap-4 pb-3 border-b border-slate-100 px-5 pt-4">
                      <div className="relative h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 ring-4 ring-white shadow-sm">
                        {w.logo_url ? (
                          <Image
                            fill
                            src={w.logo_url}
                            alt={`Logo ${w.nombre}`}
                            className="rounded-xl object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <Image
                            fill
                            src="/logos/default.svg"
                            alt={`Logo ${w.nombre}`}
                            className="rounded-xl object-cover"
                            sizes="56px"
                          />
                        )}
                      </div>
                      {wEstaPendiente && (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-500">
                          <Clock className="h-3 w-3 text-white" />
                        </span>
                      )}
                      {wEstaAceptado && (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </span>
                      )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 truncate pr-4">{w.nombre}</h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span className="truncate">{w.ciudad}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {wEstaPendiente && (
                            <Badge className="border-amber-200 bg-amber-50 text-amber-700 shrink-0 px-2 py-0.5 text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Pendiente
                            </Badge>
                          )}
                          {wEstaAceptado && (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 shrink-0 px-2 py-0.5 text-xs flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Vinculado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardBody className="flex-1 space-y-3 pt-3 px-5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-800">{w.telefono}</span>
                  </div>

                  {/* Estado de disponibilidad */}
                  <div className="flex items-center gap-2 text-xs font-medium">
                    {noDisponible ? (
                      <>
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-red-700">No disponible</span>
                      </>
                    ) : tieneCupos ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-700">Recibiendo vehículos</span>
                        <span className="text-slate-600">· {w.cupos_disponibles === 1 ? "1 cupo" : w.cupos_disponibles + " cupos"} disponibles</span>
                      </>
                    ) : w.acepta_vehiculos !== false ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-700">Recibiendo vehículos</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-500">Disponibilidad: consulta con el taller</span>
                      </>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="pt-2 space-y-2">
                    {!wEstaPendiente && !wEstaAceptado && wTienePublico && (
                      <>
                        {vincError[w.id] && (
                          <Alert tone="error" className="text-sm p-2">{vincError[w.id]}</Alert>
                        )}
                        {vincMsg[w.id] && (
                          <Alert tone="success" className="text-sm p-2">{vincMsg[w.id]}</Alert>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            vincularConPublico(w.id);
                          }}
                          className="w-full justify-center gap-2"
                          disabled={vinculando === w.id || wYaVinculado}
                        >
                          {vinculando === w.id ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Vinculando…
                            </>
                          ) : wYaVinculado ? (
                            <>
                              <CheckCircle className="h-4 w-4" /> Ya vinculado
                            </>
                          ) : (
                            <>
                              <Key className="h-4 w-4" /> Vincularse a este taller
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {wEstaPendiente && (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={cancelando === w.id}
                          className="w-full justify-center gap-2"
                        >
                          {cancelando === w.id ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Cancelando…
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4" /> Esperando respuesta del taller
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); cancelarVinculacion(w.id); }}
                          disabled={cancelando === w.id}
                          className="w-full justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <ExternalLink className="h-4 w-4" /> Cancelar solicitud
                        </Button>
                      </div>
                    )}
                    {wEstaAceptado && (
                      <Button size="sm" variant="secondary" disabled className="w-full justify-center gap-2">
                        <CheckCircle className="h-4 w-4" /> Ya vinculado ✓
                      </Button>
                    )}
                    {!wTienePublico && !wEstaPendiente && !wEstaAceptado && (
                      <div className="text-center py-2">
                        <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                          <Key className="h-3.5 w-3.5" /> Pide tu enlace personal al taller para vincularte
                        </p>
                      </div>
                    )}
                  </div>
                </CardBody>

                {!wEstaPendiente && !wEstaAceptado && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-600/20 to-transparent group-hover:opacity-100 opacity-0 transition-opacity" />
                )}
              </Card>
              </div>
            );
          })}

          {hayMas && (
            <div className="lg:col-span-3 flex justify-center">
              <Button
                size="lg"
                variant="ghost"
                onClick={() => router.push("/cuenta")}
                className="min-w-[220px] mt-4"
              >
                <ChevronDown className="h-4 w-4 ml-2" /> Ver todos los talleres ({talleres.length})
              </Button>
            </div>
          )}
        </div>
      </Accordion>
    </>
  );
}
