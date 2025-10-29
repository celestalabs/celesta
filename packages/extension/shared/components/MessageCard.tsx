import { FrontendWSMessage, RequestId, WSMessage } from "@celesta/types";
import React from "react";
import { UIMessageRepr } from "../types";
import ReactMarkdown from "react-markdown";

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
          <ItemDescription className="!line-clamp-none !text-wrap">
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
    <Item
      variant="outline"
      className={
        message.type === "agent" && message.messageType === "final"
          ? "border-green-400 bg-green-50"
          : undefined
      }
    >
      <ItemContent>
        <ItemTitle>{message.type === "agent" ? "Celesta ✨" : "You"}</ItemTitle>
        <ItemDescription className="!line-clamp-none !text-wrap">
          <ReactMarkdown
            components={{
              hr: () => <hr className="my-2 border-t border-muted" />,
              p: ({ children }) => (
                <p className="mb-1 text-muted-foreground text-sm">{children}</p>
              ),
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mb-1 text-foreground">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold mb-1 text-foreground">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold mb-1 text-foreground">
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc ml-6 mb-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal ml-6 mb-2">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code: ({ children }) => (
                <code className="bg-muted rounded px-1 py-0.5 font-mono text-sm">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted rounded p-2 overflow-x-auto mb-2">
                  <code>{children}</code>
                </pre>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="underline text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-muted pl-4 italic text-muted-foreground mb-2">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </ItemDescription>
      </ItemContent>
    </Item>
  );
});
