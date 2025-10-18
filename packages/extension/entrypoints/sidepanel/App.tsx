import { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from "ai";
import { Mic, Send, Square } from "lucide-react";
import React, { FormEventHandler } from "react";
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Avatar, AvatarFallback } from "~/shared/components/ui/avatar";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { useLocalChat } from "~/shared/hooks/useLocalChat";

const isToolPart = (
  part: UIMessagePart<UIDataTypes, UITools>
): part is ToolUIPart => part.type.startsWith("tool-");

const App = React.memo(function AppFn() {
  const { messages, sendMessage } = useLocalChat();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = React.useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages / mic on
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isRecording) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isRecording]);

  // stub method
  const handleVoiceRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording implementation would go here
    console.log(
      isRecording ? "Stopping recording..." : "Starting recording..."
    );
  };

  const handleSubmit = useCallback<FormEventHandler>(
    (e) => {
      e.preventDefault();
      sendMessage({
        text: input,
      });
      setInput("");
    },
    [input, sendMessage]
  );

  return (
    <div className="flex flex-col min-h-screen h-full max-w-4xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role !== "user" && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  C
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-card text-card-foreground"
              }`}
            >
              <p className="text-sm leading-relaxed">
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <div key={`${message.id}-${i}`}>{part.text}</div>;
                  }

                  if (part.type === "step-start") return;

                  if (isToolPart(part)) {
                    const [_, toolName] = part.type.split("tool-");
                    const [integrationName, actionName] = toolName.split("__");
                    const niceName = `${integrationName} - ${actionName}`;

                    return (
                      <div key={`${message.id}-${i}`}>
                        {part.output != null ? (
                          <details>
                            <summary>
                              <i>{niceName}</i>
                            </summary>
                            <pre>{JSON.stringify(part.output, null, 2)}</pre>
                          </details>
                        ) : (
                          <i>niceName</i>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={`${message.id}-${i}`}>{JSON.stringify(part)}</div>
                  );
                })}
              </p>
              <p
                className={`text-xs mt-1 ${
                  message.role === "user"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              ></p>
            </div>

            {message.role === "user" && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                  U
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recording Indicator */}
      {isRecording && (
        <div className="px-4 py-2 bg-accent/10 border-t border-border">
          <div className="flex items-center gap-2 text-accent">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Recording...</span>
            <div className="flex gap-1 ml-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-accent rounded-full animate-pulse"
                  style={{
                    height: Math.random() * 20 + 10,
                    animationDelay: `${i * 0.1}s`,
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <form className="flex gap-2 items-end" onSubmit={handleSubmit}>
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="pr-12 bg-input border-border focus:ring-ring"
            />
          </div>

          <Button
            onClick={handleVoiceRecording}
            variant={isRecording ? "destructive" : "secondary"}
            size="icon"
            className={`h-10 w-10 ${
              isRecording
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-accent hover:bg-accent/90 text-accent-foreground"
            }`}
            type="button"
          >
            {isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="submit"
            disabled={!input.trim()}
            className="h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
});

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
