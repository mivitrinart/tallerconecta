"use client";

import { OnboardingTrigger } from "@/components/shared/OnboardingWizard";

interface DashboardOnboardingProps {
  show: boolean;
  onComplete: () => void;
}

export function DashboardOnboarding({ show, onComplete }: DashboardOnboardingProps) {
  if (!show) return null;
  return <OnboardingTrigger show={true} onComplete={onComplete} />;
}