"use client";
/** Subida de foto de perfil del taller. En demo la imagen se guarda como data-URI. */
import { useRef, useState } from "react";
import { Upload, Image, RefreshCw } from "lucide-react";
import { Button, Alert } from "@/components/ui";

interface LogoUploadProps {
  valor: string;
  onChange: (valor: string) => void;
  /** Persiste la foto en el servidor (opcional). Si se omite, solo se actualiza el estado local. */
  onSave?: () => Promise<void>;
}

export function LogoUpload({ valor, onChange, onSave }: LogoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen (JPG, PNG, WebP, etc.).");
      return;
    }
    if (file.size > 500 * 1024) {
      setError("La imagen supera 500 KB. Elige una más liviana.");
      return;
    }
    try {
      const data = await leerComoDataUrl(file);
      setPreview(data);
      onChange(data);
    } catch {
      setError("No se pudo procesar la imagen.");
    }
  }

  function leerComoDataUrl(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = (e) => reject(new Error((e as Event)?.type ?? "Error al leer la imagen"));
      r.readAsDataURL(file);
    });
  }

  async function guardar() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      onChange(preview);
      if (onSave) await onSave();
    } catch {
      setError("No se pudo guardar la foto de perfil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">Foto de perfil del taller</p>
      <div className="flex flex-col items-center gap-3 md:flex-row md:items-start">
        <div className="relative group">
          {preview ? (
            <img
              src={preview}
              alt="Vista previa del logo"
              className="w-32 h-32 rounded-full object-cover border-4 border-brand-200 bg-slate-100"
            />
          ) : valor ? (
            <img
              src={valor}
              alt="Logo actual"
              className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 bg-slate-100"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold border-4 border-slate-200">
              ?
            </div>
          )}
          <span className="absolute -bottom-2 -right-2 flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
            <Image className="h-3 w-3" /> Foto
          </span>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            <Upload className="h-4 w-4" /> Subir foto
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview(null);
                fileRef.current!.value = "";
              }}
            >
              <RefreshCw className="h-4 w-4" /> Cambiar
            </Button>
          )}
        </div>
      </div>

      {preview && (
        <Button type="button" size="sm" onClick={guardar} loading={loading} disabled={!preview}>
          Guardar foto de perfil
        </Button>
      )}

      {error && <Alert tone="error" className="mt-2">{error}</Alert>}
      <p className="text-xs text-slate-500">
        Máx. 500 KB · la imagen se guarda embebida en la demo (sin servidor de archivos).
      </p>
    </div>
  );
}
