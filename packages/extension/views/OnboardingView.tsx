import { type IntegrationName, logger } from "@celesta/common";
import React from "react";
import { IntegrationCard } from "../components/IntegrationCard";
import { OnboardingProgress } from "../components/OnboardingProgress";
import { OnboardingStep } from "../components/OnboardingStep";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useOAuth } from "../hooks/useOAuth";
import { apiClient } from "../utils/apiClient";
import { supabase } from "../utils/supabase";
import {
  completeOnboarding,
  updateOnboardingProgress,
} from "../utils/supabaseDatabase";

const log = logger("OnboardingView");

const TOTAL_STEPS = 4;

export const OnboardingView = React.memo(() => {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [selectedIntegrations, setSelectedIntegrations] = useState<
    IntegrationName[]
  >([]);
  const [availableIntegrations, setAvailableIntegrations] = useState<
    Array<{
      name: IntegrationName;
      displayName: string;
      description: string;
      logoUrl: string | null;
      requiresUserAuth: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [authenticatingIntegration, setAuthenticatingIntegration] = useState<
    string | null
  >(null);

  const { handleOAuthFlow } = useOAuth();

  // Fetch available integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      const response = await apiClient.listIntegrations({});
      if (response.success) {
        const integrations = Object.entries(response.integrations)
          .filter(([, metadata]) => (metadata as any).requiresUserAuth)
          .map(([name, metadata]) => {
            const meta = metadata as any;
            return {
              name: name as IntegrationName,
              displayName: meta.name,
              description: meta.description,
              logoUrl: meta.logoUrl,
              requiresUserAuth: meta.requiresUserAuth,
            };
          });
        setAvailableIntegrations(integrations);
      }
    };

    fetchIntegrations();
  }, []);

  const handleToggleIntegration = useCallback(
    (integration: IntegrationName) => {
      setSelectedIntegrations((prev) =>
        prev.includes(integration)
          ? prev.filter((i) => i !== integration)
          : [...prev, integration]
      );
    },
    []
  );

  const handleNext = useCallback(async () => {
    if (step === 1 && firstName.trim()) {
      // Save first name
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await updateOnboardingProgress(user.id, { first_name: firstName });
      }
    }

    if (step === 2 && selectedIntegrations.length > 0) {
      // Save selected integrations
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await updateOnboardingProgress(user.id, {
          enabled_integrations: selectedIntegrations,
        });
      }
    }

    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, [step, firstName, selectedIntegrations]);

  const handleSkip = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const handleAuthenticateIntegrations = useCallback(async () => {
    setLoading(true);

    for (const integration of selectedIntegrations) {
      setAuthenticatingIntegration(integration);
      try {
        await handleOAuthFlow(integration);
      } catch (error) {
        log(`Failed to authenticate ${integration}:`, error);
      }
    }

    setAuthenticatingIntegration(null);
    setLoading(false);
    setStep((prev) => prev + 1);
  }, [selectedIntegrations, handleOAuthFlow]);

  const [completed, setCompleted] = useState(false);

  const handleComplete = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await completeOnboarding(user.id);
      setCompleted(true);
    }
  }, []);

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold">meow</h1>
          <p className="text-muted-foreground">You can close this tab now</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-8 left-0 right-0 z-10">
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {step === 0 && (
        <OnboardingStep
          title="Welcome to Celesta! 👋"
          subtitle="Let's get you set up in just a few steps"
        >
          <div className="flex justify-center pt-8">
            <Button size="lg" onClick={handleNext} className="px-12">
              Get Started
            </Button>
          </div>
        </OnboardingStep>
      )}

      {step === 1 && (
        <OnboardingStep
          title="What's your first name?"
          subtitle="We'll use this to personalize your experience"
        >
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            className="text-xl py-6 text-center"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && firstName.trim()) {
                handleNext();
              }
            }}
          />
          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={handleSkip}>
              Skip
            </Button>
            <Button
              onClick={handleNext}
              disabled={!firstName.trim()}
              className="px-8"
            >
              Continue
            </Button>
          </div>
        </OnboardingStep>
      )}

      {step === 2 && (
        <OnboardingStep
          title="Connect your tools"
          subtitle="Select the integrations you want to use with Celesta"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
            {availableIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.name}
                integrationName={integration.name}
                name={integration.displayName}
                description={integration.description}
                logoUrl={integration.logoUrl}
                selected={selectedIntegrations.includes(integration.name)}
                onToggle={handleToggleIntegration}
              />
            ))}
          </div>
          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedIntegrations.length === 0}
              className="px-8"
            >
              Continue ({selectedIntegrations.length} selected)
            </Button>
          </div>
        </OnboardingStep>
      )}

      {step === 3 && (
        <OnboardingStep
          title={
            authenticatingIntegration
              ? `Authenticating ${authenticatingIntegration}...`
              : selectedIntegrations.length > 0
                ? "Authenticate your integrations"
                : "You're all set! 🎉"
          }
          subtitle={
            authenticatingIntegration
              ? "Please complete the authentication in the popup"
              : selectedIntegrations.length > 0
                ? "We'll authenticate each integration you selected"
                : "You can always add integrations later in settings"
          }
        >
          {selectedIntegrations.length > 0 ? (
            <div className="flex justify-center pt-8">
              <Button
                size="lg"
                onClick={handleAuthenticateIntegrations}
                disabled={loading}
                className="px-12"
              >
                {loading ? "Authenticating..." : "Authenticate Integrations"}
              </Button>
            </div>
          ) : (
            <div className="flex justify-center pt-8">
              <Button size="lg" onClick={handleComplete} className="px-12">
                Complete Setup
              </Button>
            </div>
          )}
        </OnboardingStep>
      )}
    </div>
  );
});
