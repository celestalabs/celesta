import type {
  FrontendWSMessage,
  WorkflowId,
  WorkflowStatus,
} from "@celesta/common";
import React from "react";
import { MessageCard } from "../components/MessageCard";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../components/ui/item";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
import { useUIMessages } from "../hooks/useUIMessages";
import { useStore } from "../store";

type Props = { sendMessage: (message: FrontendWSMessage) => void };

const statusEmojiMap = {
  running: "🏃‍♂️",
  completed: "✅",
  failed: "❌",
  finishing: "🏁",
} satisfies Record<WorkflowStatus, string>;

export const WorkflowView = React.memo(({ sendMessage }: Props) => {
  const currentView = useStore((state) => state.currentView);
  const workflowMetadata = useStore((state) => state.workflowMetadata);

  const metadata = workflowMetadata[currentView as WorkflowId]!;
  const [workflowMessages] = useUIMessages(currentView);

  // Auto-scroll logic
  const scrollRef = useAutoScrollToBottom(workflowMessages.length);

  return (
    <>
      <div className="px-4">
        <Item>
          <ItemMedia>{statusEmojiMap[metadata.status]}</ItemMedia>
          <ItemContent>
            <ItemTitle>Workflow Directions</ItemTitle>
            <ItemDescription>{metadata.prompt}</ItemDescription>
          </ItemContent>
        </Item>
      </div>
      <div
        ref={scrollRef}
        className="flex-auto flex flex-col gap-4 overflow-y-auto px-4"
      >
        {workflowMessages.map((msg, index) => (
          <MessageCard
            contextId={currentView}
            key={index}
            message={msg}
            sendMessage={sendMessage}
          />
        ))}
      </div>
    </>
  );
});
