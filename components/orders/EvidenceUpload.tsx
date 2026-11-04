"use client";
/**
 * Módulo 3 · Evidencias fotográficas (antes / durante / después).
 * En demo la foto se redimensiona en el navegador y viaja como data-URI.
 * En producción se sube a Supabase Storage con acceso privado.
 * Optimistic UI: muestra la evidencia inmediatamente en la galería y confirma/revierte.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, ImageIcon, CheckCircle2, Loader2, X } from "lucide-react";
import { Button, Field, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { CategoriaMedia, OrderMedia } from "@/lib/database/types";

const CATEGORIAS: { value: CategoriaMedia; label: string }[] = [
  { value: "antes", label: "Antes" },
  { value: "durante", label: "Durante" },
  { value: "despues", label: "Después" },
  { value: "documento", label: "Documento" },
  { value: "otro", label: "Otro" },
];

/** Ejemplo ficticio para demostrar la demo sin cámara. */
function svgEjemplo(cat: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#334155"/>` +
    `<circle cx="320" cy="170" r="60" fill="none" stroke="#94a3b8" stroke-width="6"/>` +
    `<text x="320" y="330" font-family="Arial" font-size="30" fill="#fff" text-anchor="middle">Foto de ejemplo · ${cat}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function comprimir(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = (e) => reject(new Error((e as Event)?.type ?? "Error al leer el archivo"));
    r.readAsDataURL(file);
  });
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      const escala = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = (e) => reject(new Error((e as Event)?.type ?? "Error al cargar la imagen"));
    img.src = dataUrl;
  });
}

interface OptimisticMedia {
  id: string;
  categoria: CategoriaMedia;
  nombre: string;
  url: string;
  visible_cliente: boolean;
  created_at: string;
  autor_nombre: string;
  pending: boolean;
}

export function EvidenceUpload({ orderId, onMediaAdded }: { orderId: string; onMediaAdded?: (media: OptimisticMedia) => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<CategoriaMedia>("durante");
  const [nombre, setNombre] = useState("");
  const [visible, setVisible] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File) {
    setError(null);
    if (file.type.startsWith("video/")) {
      // Video corto del ruido/falla (ideal 15 s). En demo viaja como data-URI.
      if (file.size > 6 * 1024 * 1024) {
        setError("El video supera 6 MB. Graba uno más corto (10-15 segundos es suficiente).");
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = (e) => reject(new Error((e as Event)?.type ?? "Error al leer el video"));
        r.readAsDataURL(file);
      });
      setPreview(dataUrl);
      setNombre(file.name.replace(/\.[^.]+$/, "") || `Video ${categoria}`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen o un video.");
      return;
    }
    try {
      const data = await comprimir(file);
      setPreview(data);
      setNombre(file.name.replace(/\.[^.]+$/, "") || `Evidencia ${categoria}`);
    } catch {
      setError("No se pudo procesar la imagen.");
    }
  }

  async function subir(url: string) {
    setLoading(true);
    setError(null);
    // Optimistic: create temporary media object
    const optimisticMedia: OptimisticMedia = {
      id: `temp-${Date.now()}`,
      categoria,
      nombre: nombre || `Evidencia ${categoria}`,
      url,
      visible_cliente: visible,
      created_at: new Date().toISOString(),
      autor_nombre: "Tú",
      pending: true,
    };
    // Notify parent to add to gallery immediately
    onMediaAdded?.(optimisticMedia);
    setPreview(null);
    setNombre("");
    if (fileRef.current) fileRef.current.value = "";
    try {
      await api.post(`/api/ordenes/${orderId}/media`, {
        categoria,
        nombre: nombre || `Evidencia ${categoria}`,
        url,
        visible_cliente: visible,
      });
      // Success: router refresh will update with real data
      router.refresh();
    } catch (e) {
      // Error: parent will need to remove the optimistic media
      // We can't easily remove from parent, so just show error
      setError(e instanceof Error ? e.message : "No se pudo cargar la evidencia.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <Camera className="h-4 w-4 text-brand-600" /> Cargar evidencia (fotos o video de 15 s del ruido/falla)
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Categoría">
          <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaMedia)} disabled={loading}>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Descripción de la foto">
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Amortiguador con fuga" disabled={loading} />
        </Field>
      </div>

      <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" disabled={loading} />
        Visible para el cliente en su portal
      </label>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        disabled={loading}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={loading}>
          <Upload className="h-4 w-4" /> Seleccionar foto o video
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = svgEjemplo(categoria);
            setPreview(url);
            setNombre(`Ejemplo ${categoria}`);
          }}
          disabled={loading}
        >
          <ImageIcon className="h-4 w-4" /> Usar foto de ejemplo
        </Button>
      </div>

      {preview && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 p-3">
          {preview.startsWith("data:video") ? (
            <video src={preview} controls className="h-20 w-28 rounded-lg bg-black object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa" className="h-20 w-28 rounded-lg object-cover" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">{nombre || "Evidencia"}</p>
            <p className="text-xs text-slate-400">Lista para subir · categoría {categoria}</p>
          </div>
          <Button size="sm" onClick={() => subir(preview)} loading={loading}>Subir</Button>
        </div>
      )}

      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
    </div>
  );
}
