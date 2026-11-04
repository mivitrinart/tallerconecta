"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

interface ChatMessage {
  id: string;
  contenido: string;
  remitente_tipo: "customer" | "staff";
  leido: boolean;
  created_at: string;
  remitente_nombre: string;
}

interface ChatButtonProps {
  orderId: string;
  token: string;
  titulo: string;
  ordenActiva: { orderId: string; token: string; numero: string } | null;
}

export function ChatButton({ orderId, token, titulo, ordenActiva }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [noLeidos, setNoLeidos] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const hasOrder = !!ordenActiva;
  const activeOrderId = ordenActiva?.orderId ?? orderId;
  const activeToken = ordenActiva?.token ?? token;

  if (!hasOrder) return null;

  const fetchMessages = useCallback(async (isPoll = false) => {
    if (!hasOrder) return;
    try {
      if (!isPoll) setLoading(true);
      setError(null);
      const res = await fetch(`/api/ordenes/${activeOrderId}/messages?token=${encodeURIComponent(activeToken)}`);
      if (!res.ok) throw new Error("No se pudieron cargar los mensajes");
      const data = await res.json();
      if (data.messages) {
        const mapped: ChatMessage[] = data.messages.map((m: { id: string; cuerpo?: string; contenido?: string; remitente_tipo: "customer" | "staff"; leido: boolean; created_at: string; autor_nombre?: string; remitente_nombre?: string }) => ({
          id: m.id,
          contenido: m.cuerpo ?? m.contenido,
          remitente_tipo: m.remitente_tipo,
          leido: m.leido,
          created_at: m.created_at,
          remitente_nombre: m.autor_nombre ?? m.remitente_nombre ?? "Usuario",
        }));
        setMessages(mapped);
        setNoLeidos(mapped.filter((msg) => msg.remitente_tipo === "staff" && !msg.leido).length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar mensajes");
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, [hasOrder, activeOrderId, activeToken]);

  useEffect(() => {
    if (hasOrder) {
      fetchMessages();
      pollRef.current = setInterval(() => fetchMessages(true), 10000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [hasOrder, fetchMessages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    if (hasOrder) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasOrder]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      contenido: newMessage.trim(),
      remitente_tipo: "customer",
      leido: false,
      created_at: new Date().toISOString(),
      remitente_nombre: "Tú",
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    try {
      // Customer messages go through the portal endpoint
      const res = await fetch("/api/portal/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeToken, order_id: activeOrderId, contenido: optimisticMessage.contenido }),
      });
      if (!res.ok) throw new Error("No se pudo enviar el mensaje");
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar mensaje");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    }
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full p-3 shadow-lg bg-brand-600 text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2"
          aria-label={noLeidos > 0 ? `Abrir chat (${noLeidos} nuevos)` : "Abrir chat"}
          aria-expanded="false"
        >
          <MessageSquare className="h-6 w-6" />
          {noLeidos > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white animate-pulse">
              {noLeidos > 9 ? "9+" : noLeidos}
            </span>
          )}
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[100] w-full max-w-sm sm:max-w-md animate-fade-in-up">
          <div className="flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden h-[500px] sm:h-[580px]">
            <div className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white border-b border-brand-500/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium truncate">{titulo}</span>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                aria-label="Cerrar chat"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {loading && (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                  {error}
                  <Button variant="ghost" size="sm" className="mt-1" onClick={() => fetchMessages(false)}>
                    Reintentar
                  </Button>
                </div>
              )}
              {!loading && !error && (
                <>
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-slate-400 text-sm text-center px-4">
                      No hay mensajes aún. Inicia la conversación.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.remitente_tipo === "customer" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${msg.remitente_tipo === "customer" ? "bg-brand-600 text-white rounded-tr-sm" : "bg-white text-slate-900 border border-slate-200 rounded-tl-sm"}`}>
                            <p className="whitespace-pre-wrap">{msg.contenido}</p>
                            <p className={`text-[10px] mt-1 ${msg.remitente_tipo === "customer" ? "text-brand-100" : "text-slate-400"}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form onSubmit={handleSend} className="border-t border-slate-200 p-3 bg-white">
              <div className="flex items-center gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje…"
                  className="flex-1 rounded-full px-4 py-2 text-sm border border-slate-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || loading}
                  className="rounded-full p-2 bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  aria-label="Enviar mensaje"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}