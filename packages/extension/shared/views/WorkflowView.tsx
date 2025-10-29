import React from "react";
import { useStore } from "../store";
import { useUIMessages } from "../hooks/useUIMessages";
import { MessageCard } from "../components/MessageCard";
import { FrontendWSMessage } from "@celesta/types";

type Props = { sendMessage: (message: FrontendWSMessage) => void };

export const WorkflowView = React.memo(({ sendMessage }: Props) => {
  const currentView = useStore((state) => state.currentView);

  const workflowMessages = useUIMessages(currentView);

  return (
    <>
    <div className="flex-auto flex flex-col gap-4 overflow-y-auto px-4">
      {workflowMessages.map((msg, index) => (
        <MessageCard key={index} message={msg} sendMessage={sendMessage} />
      ))}
      </div>
    </>
  );
});
