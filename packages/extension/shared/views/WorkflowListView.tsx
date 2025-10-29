import { ContextId, WorkflowId, WorkflowStatus } from "@celesta/common";
import React from "react";
import { WorkflowListCard } from "../components/WorkflowListCard";
import { useStore } from "../store";

// type Props = {};

export const WorkflowListView = React.memo((/*{}: Props*/) => {
  const messagesByContext = useStore((store) => store.messagesByContext);
  const workflowMetadata = useStore((store) => store.workflowMetadata);

  const workflowIds: WorkflowId[] = useMemo(
    () =>
      (Object.keys(messagesByContext) as ContextId[])
        .filter((id) => id !== "CHAT")
        .filter((id) => id in workflowMetadata),
    [messagesByContext, workflowMetadata]
  );

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
      {workflowIds.length === 0 && (
        <div className="px-4">
          <h1 className="text-xl text-center">Wow, so empty!</h1>
        </div>
      )}

      {inProgressWorkflowIds.length > 0 && (
        <div className="px-4 flex flex-col gap-4">
          <h1 className="text-lg">Workflows in progress</h1>
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
