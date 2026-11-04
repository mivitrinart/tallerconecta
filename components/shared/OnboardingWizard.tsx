"use client";

import { useState, useEffect } from "react";
import { X, Check, ChevronRight, ChevronLeft, Car, Users, FileText, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    id: 1,
    title: "Recibe tu primer vehículo",
    description: "Registra el cliente, el vehículo, el kilometraje y los daños visibles al ingreso. Así inicias la orden de servicio.",
    icon: <Car className="h-8 w-8" />,
    cta: "Crear primera orden",
    href: "/taller/ordenes/nueva",
  },
  {
    id: 2,
    title: "Envía un presupuesto",
    description: "Detalla repuestos, mano de obra y total. El cliente lo recibe en su celular y lo aprueba o consulta con un clic.",
    icon: <FileText className="h-8 w-8" />,
    cta: "Ver órdenes",
    href: "/taller/ordenes",
  },
  {
    id: 3,
    title: "Entrega y fideliza",
    description: "Sube evidencias (fotos/video), cobra el valor acordado y pide la calificación. El cliente vuelve por el mantenimiento automático.",
    icon: <Sparkles className="h-8 w-8" />,
    cta: "Configurar recordatorios",
    href: "/taller/configuracion",
  },
];

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setCompleted(new Set());
      setDismissed(false);
    }
  }, [isOpen]);

  const handleNext = () => {
    setCompleted((prev) => new Set(prev).add(currentStep));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setDismissed(true);
      onComplete();
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    setDismissed(true);
    onComplete();
  };

  if (!isOpen || dismissed) return null;

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-500">Paso {currentStep + 1} de {STEPS.length}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{step.title}</h2>
          </div>
          <button
            onClick={handleSkip}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Omitir asistente"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-brand-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              {step.icon}
            </div>
            <div className="flex-1">
              <p className="text-slate-600 leading-relaxed">{step.description}</p>
              {completed.has(currentStep) && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <Check className="h-4 w-4" /> Paso completado
                </p>
              )}
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-1.5 transition-all",
                  i === currentStep
                    ? "text-brand-600"
                    : completed.has(i)
                    ? "text-emerald-600"
                    : "text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    i === currentStep
                      ? "bg-brand-600 text-white"
                      : completed.has(i)
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  )}
                >
                  {completed.has(i) ? <Check className="h-4 w-4" /> : s.id}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "hidden h-1 w-12 md:block",
                      completed.has(i) ? "bg-emerald-500" : "bg-slate-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4 bg-slate-50">
          {currentStep > 0 && (
            <Button variant="secondary" onClick={handlePrev} className="flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
          )}
          <div className="flex-1 flex justify-end gap-2">
            {currentStep < STEPS.length - 1 ? (
              <a
                href={step.href}
                onClick={handleNext}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                {step.cta}
                <ChevronRight className="h-4 w-4" />
              </a>
            ) : (
              <Button onClick={handleNext} className="flex items-center gap-1.5">
                <Check className="h-4 w-4" /> ¡Empezar ahora!
              </Button>
            )}
          </div>
        </div>

        {/* Dismiss hint */}
        <div className="px-4 py-2 text-center">
          <p className="text-xs text-slate-400">
            Puedes cerrar esto en cualquier momento y volver desde Configuración.
          </p>
        </div>
      </div>
    </div>
  );
}

interface OnboardingTriggerProps {
  show: boolean;
  onComplete: () => void;
}

export function OnboardingTrigger({ show, onComplete }: OnboardingTriggerProps) {
  const [isOpen, setIsOpen] = useState(show);

  useEffect(() => {
    setIsOpen(show);
  }, [show]);

  if (!isOpen) return null;

  return (
    <OnboardingWizard
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onComplete={() => {
        setIsOpen(false);
        onComplete();
      }}
    />
  );
}