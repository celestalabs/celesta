import React from "react";

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const OnboardingStep = React.memo(
  ({ children, title, subtitle }: Props) => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 animate-in fade-in duration-500">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-xl text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="space-y-6">{children}</div>
        </div>
      </div>
    );
  }
);
