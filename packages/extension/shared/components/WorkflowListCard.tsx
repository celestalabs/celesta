import React from "react";
import { useStore } from "../store";
import { WorkflowId, WorkflowStatus } from "@celesta/types";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemMedia,
  ItemActions,
} from "./ui/item";
import { Button } from "./ui/button";

type Props = {
  workflowId: WorkflowId;
};

const statusEmojiMap = {
  running: "🏃‍♂️",
  completed: "✅",
  failed: "❌",
} satisfies Record<WorkflowStatus, string>;

export const WorkflowListCard = React.memo(({ workflowId }: Props) => {
  const workflowMetadata = useStore((state) => state.workflowMetadata);
  const routeToView = useStore((state) => state.routeToView);

  const metadata = useMemo(
    () => workflowMetadata[workflowId]!,
    [workflowId, workflowMetadata]
  );

  const shortenedTitle =
    metadata.prompt.length > 50
      ? metadata.prompt.slice(0, 170) + "..."
      : metadata.prompt;

  return (
    <Item variant="outline">
      <ItemMedia>
        <span className="text-xl">{statusEmojiMap[metadata.status]}</span>
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="line-clamp-2">{shortenedTitle}</ItemTitle>
        <ItemDescription className="capitalize">
          {metadata.status + (metadata.status === "running" ? "..." : ".")}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button onClick={() => routeToView(workflowId)}>View</Button>
      </ItemActions>
    </Item>
  );
});
