import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OnboardingView } from "~/views/OnboardingView";
import { AuthView } from "~/views/AuthView";
import { supabase } from "~/utils/supabase";
import { getUserOnboardingStatus } from "~/utils/supabaseDatabase";
import "~/styles/globals.css";

const App = React.memo(() => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    const checkStatus = async () => {
      // Check initial auth state
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      if (session?.user) {
        // Check onboarding status
        const { data } = await getUserOnboardingStatus(session.user.id);
        setOnboardingComplete(data?.onboarding_completed ?? false);
      }
    };

    checkStatus();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        const { data } = await getUserOnboardingStatus(session.user.id);
        setOnboardingComplete(data?.onboarding_completed ?? false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading state
  if (isAuthenticated === null || (isAuthenticated && onboardingComplete === null)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show meow if onboarding is complete
  if (onboardingComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold">meow</h1>
          <p className="text-muted-foreground">You're all set!</p>
        </div>
      </div>
    );
  }

  // Show auth view if not authenticated
  if (!isAuthenticated) {
    return <AuthView />;
  }

  // Show onboarding if authenticated but not complete
  return <OnboardingView />;
});

createRoot(document.getElementById("root")!).render(<App />);
