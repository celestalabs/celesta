import { FrontendWSMessage, RequestId, WSMessage } from "@celesta/types";
import React from "react";
import { UIMessageRepr } from "../types";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ButtonGroup } from "./ui/button-group";
import { Button } from "./ui/button";

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
    return (
      <Card>
        <CardHeader>
          <CardTitle>{message.toolName}</CardTitle>
          <CardDescription className="overflow-x-hidden">
            <pre className="wrap-break-word whitespace-pre-wrap">
              <b>Input:</b> <code>{message.input}</code>
              {message.output != null && (
                <>
                  <br />
                  <b>Output:</b> <code>{message.output}</code>
                </>
              )}
            </pre>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (message.type === "workflow-request") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start a workflow?</CardTitle>
          <CardDescription>{message.prompt}</CardDescription>
        </CardHeader>
        <CardFooter>
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
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{message.type}</CardTitle>
        <CardDescription>{message.content}</CardDescription>
      </CardHeader>
    </Card>
  );
});
