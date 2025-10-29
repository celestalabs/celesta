import React from "react";
import { useStore } from "../store";
import { useUIMessages } from "../hooks/useUIMessages";
import { MessageCard } from "../components/MessageCard";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
import { FrontendWSMessage, WorkflowId } from "@celesta/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

type Props = { sendMessage: (message: FrontendWSMessage) => void };

export const WorkflowView = React.memo(({ sendMessage }: Props) => {
  const currentView = useStore((state) => state.currentView);
  const workflowMetadata = useStore((state) => state.workflowMetadata);
  const tasksByWorkflow = useStore((state) => state.tasksByWorkflow);

  const metadata = workflowMetadata[currentView as WorkflowId]!;
  const workflowMessages = useUIMessages(currentView);

  // Auto-scroll logic
  const scrollRef = useAutoScrollToBottom(workflowMessages.length);

  return (
    <>
      <div className="px-4">
        <Accordion collapsible type="single">
          <AccordionItem value="tasks">
            <AccordionTrigger>
              <small>{metadata.prompt}</small>
            </AccordionTrigger>
            <AccordionContent>
              <ul>
                {tasksByWorkflow[currentView as WorkflowId]?.map((task) => (
                  <li key={task.slug}>
                    <b>{task.slug}:</b> {task.description} (<i>{task.status}</i>
                    )
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
