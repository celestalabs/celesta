import { ContextId, WorkflowId } from "@celesta/types";
import React from "react";
import { useStore } from "../store";
import { WorkflowListCard } from "../components/WorkflowListCard";

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

  const inProgressWorkflowIds = workflowIds.filter(
    (id) => workflowMetadata[id]!.status === "running"
  );

  const pastWorkflowIds = workflowIds.filter(
    (id) => workflowMetadata[id]!.status !== "running"
  );

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
