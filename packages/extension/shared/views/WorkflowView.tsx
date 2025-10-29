import React from "react";
import { useStore } from "../store";
import { useUIMessages } from "../hooks/useUIMessages";
import { MessageCard } from "../components/MessageCard";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
import { FrontendWSMessage, WorkflowId } from "@celesta/types";

type Props = { sendMessage: (message: FrontendWSMessage) => void };

export const WorkflowView = React.memo(({ sendMessage }: Props) => {
  const currentView = useStore((state) => state.currentView);
  const workflowMetadata = useStore((state) => state.workflowMetadata);

  const metadata = workflowMetadata[currentView as WorkflowId]!;
  const workflowMessages = useUIMessages(currentView);

  // Auto-scroll logic
  const scrollRef = useAutoScrollToBottom(workflowMessages.length);

  return (
    <>
      <div className="px-4">
        <h3 className="text-md">
          <b>Goal:</b> {metadata.prompt}
        </h3>
      </div>
      <div ref={scrollRef} className="flex-auto flex flex-col gap-4 overflow-y-auto px-4">
        {workflowMessages.map((msg, index) => (
          <MessageCard contextId={currentView} key={index} message={msg} sendMessage={sendMessage} />
        ))}
      </div>
    </>
  );
});
