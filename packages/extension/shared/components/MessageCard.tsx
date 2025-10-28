import { WSMessage } from "@celesta/types";
import React from "react";
import { UIMessageRepr } from "../types";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

type Props = {
  message: UIMessageRepr;
};

export const MessageCard = React.memo(({ message }: Props) => {
  return message.type === "tool" ? (
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
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{message.type}</CardTitle>
        <CardDescription>{message.content}</CardDescription>
      </CardHeader>
    </Card>
  );
});
