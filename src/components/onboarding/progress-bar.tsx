'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { ONBOARDING_STEPS } from '@/lib/onboarding/constants';
import type { OnboardingStep } from '@/types/database';

interface ProgressBarProps {
  currentStep: OnboardingStep;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={step.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center gap-1.5 w-full">
                {/* Step circle */}
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors',
                    isCompleted && 'bg-[#01A0FF] text-white',
                    isCurrent && 'bg-[#01A0FF] text-white ring-4 ring-[#01A0FF]/20',
                    !isCompleted && !isCurrent && 'bg-[#E2E8F0] text-[#94A3B8]'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.number + 1}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    'text-[11px] font-medium text-center hidden sm:block',
                    isCurrent ? 'text-[#253859]' : 'text-[#94A3B8]'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < ONBOARDING_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2 mt-[-18px] sm:mt-[-28px]',
                    index < currentIndex ? 'bg-[#01A0FF]' : 'bg-[#E2E8F0]'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
