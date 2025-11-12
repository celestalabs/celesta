import React from "react";

interface Props {
  currentStep: number;
  totalSteps: number;
}

export const OnboardingProgress = React.memo(
  ({ currentStep, totalSteps }: Props) => {
    return (
      <div className="flex justify-center gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index < currentStep
                ? "w-8 bg-primary"
                : index === currentStep
                  ? "w-12 bg-primary"
                  : "w-8 bg-muted"
            }`}
          />
        ))}
      </div>
    );
  }
);
