import { WSMessage } from "@celesta/types";
import React from "react";
import { useStore } from "../store";

// type Props = {};

export const WorkflowListView = React.memo((/*{}: Props*/) => {
  const messagesByContext = useStore((store) => store.messagesByContext);

  const workflowIds = useMemo(
    () => Object.keys(messagesByContext).filter((id) => id !== "CHAT"),
    [messagesByContext]
  );

  return (
    <>
      <div className="px-4 flex-col gap-4">
        <h1 className="text-lg">Workflows in progress</h1>
        {workflowIds}
      </div>
      <div className="px-4 flex-col gap-4">
        <h1 className="text-lg">Past workflows</h1>
      </div>
    </>
  );
});
