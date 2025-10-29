import { FrontendWSMessage, RequestId, WSMessage } from "@celesta/types";
import React from "react";
import { UIMessageRepr } from "../types";

import { ButtonGroup } from "./ui/button-group";
import { Button } from "./ui/button";
import {
  Item,
  ItemDescription,
  ItemFooter,
  ItemContent,
  ItemTitle,
} from "./ui/item";

type Props = {
  message: UIMessageRepr;
  sendMessage: (message: FrontendWSMessage) => void;
};

export const MessageCard = React.memo(({ message, sendMessage }: Props) => {
  const handleProvideStartWorkflow = useCallback(
    (requestId: RequestId, yes: boolean) => {
      sendMessage({
        type: "PROVIDE_SHOULD_START_WORKFLOW",
        contextId: "CHAT",
        requestId,
        yes,
      });
    },
    [sendMessage]
  );

  if (message.type === "tool") {
    let [integrationName, toolName] = message.toolName.split("__");
    integrationName = integrationName.split("_").join(" ");
    toolName = toolName.split("_").join(" ");

    return (
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>
            <span>
              {message.output == null ? "⏳ Using" : "✅ Finished using"}
              <span className="capitalize">
                &nbsp;{integrationName} ({toolName})
              </span>
            </span>
          </ItemTitle>
        </ItemContent>
      </Item>
    );
  }

  if (message.type === "workflow-request") {
    return (
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Start a workflow?</ItemTitle>
          <ItemDescription className="!line-clamp-none">
            {message.prompt}
          </ItemDescription>
        </ItemContent>
        <ItemFooter>
          <ButtonGroup>
            <Button
              size="sm"
              onClick={() =>
                handleProvideStartWorkflow(message.requestId, true)
              }
            >
              Start
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                handleProvideStartWorkflow(message.requestId, false)
              }
            >
              Dismiss
            </Button>
          </ButtonGroup>
        </ItemFooter>
      </Item>
    );
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{message.type === "agent" ? "Celesta ✨" : "You"}</ItemTitle>
        <ItemDescription className="!line-clamp-none">
          {message.content}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
});
