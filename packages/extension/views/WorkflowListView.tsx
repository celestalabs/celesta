import {
  isWorkflowId,
  type ContextId,
  type FrontendWSMessage,
  type WorkflowId,
  type WorkflowStatus,
} from "@celesta/common";
import React from "react";
import { Button } from "../components/ui/button";
import { WorkflowListCard } from "../components/WorkflowListCard";
import { useStore } from "../store";

type Props = {
  sendMessage: (message: FrontendWSMessage) => void;
};

export const WorkflowListView = React.memo(({ sendMessage }: Props) => {
  const messagesByContext = useStore((store) => store.messagesByContext);
  const workflowMetadata = useStore((store) => store.workflowMetadata);

  const workflowIds: WorkflowId[] = useMemo(
    () =>
      (Object.keys(messagesByContext) as ContextId[])
        .filter(isWorkflowId)
        .filter((id) => id in workflowMetadata),
    [messagesByContext, workflowMetadata]
  );

  const launchWorkflow = useCallback(() => {
    const prompt = window.prompt("Enter workflow directions:");
    if (!prompt) return;

    sendMessage({
      type: "REQUEST_WORKFLOW",
      prompt,
    });
  }, [sendMessage]);

  const [inProgressWorkflowIds, pastWorkflowIds] = useMemo(() => {
    const inProgressWorkflowIds: WorkflowId[] = [];
    const pastWorkflowIds: WorkflowId[] = [];

    for (const id of workflowIds) {
      if (
        (["running", "finishing"] as WorkflowStatus[]).includes(
          workflowMetadata[id]!.status
        )
      ) {
        inProgressWorkflowIds.push(id);
      } else {
        pastWorkflowIds.push(id);
      }
    }

    return [inProgressWorkflowIds, pastWorkflowIds];
  }, [workflowIds, workflowMetadata]);

  return (
    <>
      {workflowIds.length === 0 ? (
        <div className="px-4 flex-auto flex flex-col gap-4 justify-center items-center">
          <h1 className="text-2xl text-shadow-xs">Wow, so empty!</h1>
          <Button onClick={launchWorkflow}>Launch a new workflow</Button>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-4">
          <h1 className="text-lg">Workflows in progress</h1>
          <Button variant="secondary" onClick={launchWorkflow}>
            Launch a new workflow
          </Button>
          {inProgressWorkflowIds.map((id) => (
            <WorkflowListCard key={id} workflowId={id} />
          ))}
        </div>
      )}

      {pastWorkflowIds.length > 0 && (
        <div className="px-4 flex flex-col gap-4">
          <h1 className="text-lg">Past workflows</h1>
          {pastWorkflowIds.map((id) => (
            <WorkflowListCard key={id} workflowId={id} />
          ))}
        </div>
      )}
    </>
  );
});
