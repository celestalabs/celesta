import { WorkflowId, WorkflowStatus } from "@celesta/common";
import React from "react";
import { useStore } from "../store";
import { Button } from "./ui/button";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemMedia,
  ItemActions,
} from "./ui/item";

type Props = {
  workflowId: WorkflowId;
};

const statusEmojiMap = {
  running: "🏃‍♂️",
  completed: "✅",
  failed: "❌",
  finishing: "🏁",
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
        <ItemDescription className="capitalize !text-wrap">
          {metadata.status +
            (metadata.status === "running" || metadata.status === "finishing"
              ? "..."
              : ".")}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button onClick={() => routeToView(workflowId)}>View</Button>
      </ItemActions>
    </Item>
  );
});
