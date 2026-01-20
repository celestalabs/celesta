import { isBrowserAgentId, isChatId, ts } from "@celesta/common";
import React from "react";
import { createRoot } from "react-dom/client";
import { toast, Toaster } from "sonner";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { useAgentServer } from "~/hooks/useAgentServer";
import { useOAuth } from "~/hooks/useOAuth";
import { useStore } from "~/store";
import { executeBrowserAgentAction } from "~/utils/browserAgentActions";
import { executeBrowserContextAction } from "~/utils/browserContextActions";
import { supabase } from "~/utils/supabase";
import { AssistantView } from "~/views/AssistantView";
import { AuthView } from "~/views/AuthView";
import { WorkflowListView } from "~/views/WorkflowListView";
import { WorkflowView } from "~/views/WorkflowView";

const App = React.memo(() => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [hasOpenedOnboardingTab, setHasOpenedOnboardingTab] = useState(false);
  const currentView = useStore((state) => state.currentView);
  const routeToView = useStore((state) => state.routeToView);
  const tabIdByBrowserAgent = useStore((state) => state.tabIdByBrowserAgent);

  // Check authentication and onboarding status
  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      if (session?.user) {
        // Check onboarding status
        const { getUserOnboardingStatus } = await import(
          "~/utils/supabaseDatabase"
        );
        const { data } = await getUserOnboardingStatus(session.user.id);

        if (data && !data.onboarding_completed) {
          setNeedsOnboarding(true);
          // Open onboarding in new tab only once
          if (!hasOpenedOnboardingTab) {
            setHasOpenedOnboardingTab(true);
            await browser.tabs.create({
              url: browser.runtime.getURL("/newtab.html"),
            });
          }
        } else {
          setNeedsOnboarding(false);
        }
      }
    };

    checkAuthAndOnboarding();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (event === "SIGNED_IN" && session?.user) {
        // Re-check onboarding on sign in
        checkAuthAndOnboarding();
      }
    });

    // Poll for onboarding completion if user needs onboarding
    let pollInterval: number | undefined;
    if (needsOnboarding) {
      pollInterval = window.setInterval(() => {
        checkAuthAndOnboarding();
      }, 2000); // Check every 2 seconds
    }

    return () => {
      subscription.unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [needsOnboarding, hasOpenedOnboardingTab]);

  const { handleOAuthFlow } = useOAuth();

  const { sendMessage } = useAgentServer({
    AGENT_MESSAGE: () => {},
    TOOL_INVOCATION: () => {},
    TOOL_RESULT: () => {},
    REQUEST_CREDENTIALS: useCallback(
      async ({ integrationName, requestId }, send) => {
        const accessToken = await handleOAuthFlow(integrationName);
        if (accessToken != null) {
          send(
            ts({
              type: "PROVIDE_CREDENTIALS",
              integrationName,
              requestId,
              accessToken,
            })
          );
        }
      },
      [handleOAuthFlow]
    ),

    REQUEST_QUESTION_RESPONSE: (message, send) => {
      const response = prompt("Celesta asks: " + message.question);
      send(
        ts({
          type: "PROVIDE_QUESTION_RESPONSE",
          requestId: message.requestId,
          response: response || "",
          contextId: message.contextId,
        })
      );
    },

    REQUEST_SHOULD_START_WORKFLOW: () => {},
    CONTEXT_CREATED: () => {},

    // Show toast for workflow status changes
    WORKFLOW_STATUS_CHANGED: (message) => {
      // Don't show if user is already viewing the workflow
      if (currentView === message.workflowId) return;

      const toastConfig = {
        action: {
          label: "View",
          onClick: () => routeToView(message.workflowId),
        },
        position: "top-center",
      } as const;

      switch (message.status) {
        case "failed": {
          toast.error("Workflow failed! :(", {
            ...toastConfig,
            description: "Something went wrong during execution.",
          });
          break;
        }
        case "completed": {
          toast.success(`Workflow completed!`, {
            description: "Take a peek at what happened.",
            ...toastConfig,
          });
          break;
        }
        case "running": {
          toast.info("Workflow created!", {
            description: `It's running as we speak.`,
            ...toastConfig,
          });
          break;
        }
      }
    },

    WORKFLOW_TASK_STATUS_CHANGED: () => {},

    REQUEST_BROWSER_CONTEXT_ACTION: async ({ action, requestId }, send) => {
      send(
        ts({
          type: "PROVIDE_BROWSER_CONTEXT_ACTION",
          requestId,
          response: await executeBrowserContextAction(action),
        })
      );
    },
    REQUEST_BROWSER_AGENT_ACTION: async (
      { contextId, requestId, action },
      send
    ) => {
      if (!isBrowserAgentId(contextId)) {
        return send(
          ts({
            type: "PROVIDE_BROWSER_AGENT_ACTION",
            requestId,
            contextId,
            response: { text: "Invalid request" },
          })
        );
      }

      const response = await executeBrowserAgentAction(
        tabIdByBrowserAgent[contextId]!,
        action
      );

      send(
        ts({
          type: "PROVIDE_BROWSER_AGENT_ACTION",
          requestId,
          contextId,
          response,
        })
      );
    },

    BROWSER_AGENT_INITIALIZED: () => {},

    // Voice handlers - dispatched to store by useAgentServer, consumed by AssistantView
    VOICE_TRANSCRIPT: () => {},
    VOICE_TTS_CHUNK: () => {},
    VOICE_TTS_COMPLETE: () => {},
    VOICE_ERROR: () => {},
  });

  // Show loading while checking auth and onboarding
  if (
    isAuthenticated === null ||
    (isAuthenticated && needsOnboarding === null)
  ) {
    return (
      <>
        <Toaster />
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </>
    );
  }

  // Show auth view if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Toaster />
        <div className="h-full flex flex-col">
          <AuthView />
        </div>
      </>
    );
  }

  // Show onboarding message if needs onboarding
  if (needsOnboarding) {
    return (
      <>
        <Toaster />
        <div className="h-full flex items-center justify-center px-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Welcome! 👋</h2>
            <p className="text-muted-foreground">
              We&apos;ve opened a new tab to help you get started. Complete the
              setup there, then come back here!
            </p>
          </div>
        </div>
      </>
    );
  }

  // Show main app when authenticated
  return (
    <>
      <Toaster />
      <div className="h-full py-4 flex flex-col gap-4">
        <ButtonGroup className="flex w-full px-4">
          <Button
            className="flex-auto"
            variant={isChatId(currentView) ? "default" : "secondary"}
            onClick={() => routeToView("CHAT")}
          >
            Assistant
          </Button>
          <Button
            className="flex-auto"
            variant={!isChatId(currentView) ? "default" : "secondary"}
            onClick={() => routeToView("WORKFLOW_LIST")}
          >
            Workflows
          </Button>
        </ButtonGroup>

        {isChatId(currentView) ? (
          <AssistantView sendMessage={sendMessage} />
        ) : currentView === "WORKFLOW_LIST" ? (
          <WorkflowListView sendMessage={sendMessage} />
        ) : (
          <WorkflowView sendMessage={sendMessage} />
        )}
      </div>
    </>
  );
});

createRoot(document.getElementById("root")!).render(<App />);
