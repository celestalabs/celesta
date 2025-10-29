import React from "react";
import { useStore } from "../store";
import { WorkflowId } from "@celesta/types";
import { Item, ItemContent, ItemTitle, ItemDescription } from "./ui/item";

type Props = {
  workflowId: WorkflowId;
};

export const WorkflowListCard = React.memo(({ workflowId }: Props) => {
  const workflowMetadata = useStore((state) => state.workflowMetadata);
  const routeToView = useStore((state) => state.routeToView);

  const metadata = useMemo(
    () => workflowMetadata[workflowId]!,
    [workflowId, workflowMetadata]
  );

  const shortenedTitle = metadata.prompt.length > 50
    ? metadata.prompt.slice(0, 65) + "..."
    : metadata.prompt;

  return (
    <Item variant="outline" onClick={() => routeToView(workflowId)}>
      <ItemContent>
        <ItemTitle>{shortenedTitle}</ItemTitle>
        <ItemDescription>{metadata.status}</ItemDescription>
      </ItemContent>
    </Item>
  );
});
