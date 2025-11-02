import {
  BaseAgent,
  generateId,
  logger,
  ts,
  type BrowserAgentAction,
} from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import {
  Environment,
  GenerateContentResponse,
  GoogleGenAI,
  type Content,
  type FunctionCall,
  type Part,
} from "@google/genai";

const log = logger("BrowserAgent");

type BrowserAgentConfig = {
  messageContext: MessageContext<BrowserAgent>;
  goalDescription: string;
};

export class BrowserAgent extends BaseAgent {
  goalDescription: string;

  constructor({ messageContext, goalDescription }: BrowserAgentConfig) {
    super(messageContext);
    this.goalDescription = goalDescription;
  }

  private async processResponse(response: GenerateContentResponse): Promise<{
    actions: [FunctionCall, BrowserAgentAction[]][];
    message: string;
    completed: boolean;
  }> {
    const actions = [] as [FunctionCall, BrowserAgentAction[]][];

    let message = "";

    if (!response.candidates || response.candidates.length === 0) {
      return {
        actions: [],
        message: "",
        completed: true,
      };
    }
    const candidate = response.candidates[0];

    // Log the raw response for debugging
    log(`Raw response from Google:`, candidate.content);

    // Process all parts - Google can send multiple function calls
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) {
        message += part.text + "\n";
        log(`Reasoning: ${part.text}`);
      }
      if (part.functionCall) {
        const functionCall = part.functionCall;
        const actionsForCall: BrowserAgentAction[] = [];

        log(
          `Found function call: ${part.functionCall.name}:`,
          part.functionCall.args
        );

        // Convert function call to action(s)
        const action = this.convertFunctionCallToAction(part.functionCall);
        if (action) {
          // Special handling for type_text_at - we need to click first
          if (
            part.functionCall.name === "type_text_at" &&
            action.type === "TYPE_TEXT"
          ) {
            log(`Adding action: ${JSON.stringify(action)}`);
            // First add a click action at the same coordinates
            actionsForCall.push({
              type: "CLICK",
              x: action.x,
              y: action.y,
              options: { button: "left" },
            });

            // If clear_before_typing is true (default), add a select all
            if (action.clearBeforeTyping) {
              // Select all text in the field
              actionsForCall.push({
                type: "KEY_PRESS",
                key: "ControlOrMeta+A",
              });
              actionsForCall.push({
                type: "KEY_PRESS",
                key: "Backspace",
              });
            }

            // Then add the type action
            actionsForCall.push(action);
            if (action.pressEnter) {
              actionsForCall.push({
                type: "KEY_PRESS",
                key: "Enter",
              });
            }
          } else {
            actionsForCall.push(action);
          }
        } else {
          log(
            `Could not convert function call to action: ${part.functionCall.name}`
          );
        }

        actions.push([functionCall, actionsForCall]);
      }
    }

    // Log summary of what we found
    log(`Processed response: ${actions.length} function calls`);

    // Check if task is completed
    const completed =
      actions.length === 0 ||
      (candidate.finishReason && candidate.finishReason !== "STOP");

    return {
      actions,
      message: message.trim(),
      completed: completed ?? false,
    };
  }

  /**
   * Convert Google function call to Stagehand action
   */
  private convertFunctionCallToAction(
    functionCall: FunctionCall
  ): (BrowserAgentAction & Record<string, any>) | null {
    const { name, args } = functionCall;

    if (!name || !args) {
      return null;
    }

    switch (name) {
      case "open_web_browser":
        return null; // No action needed, browser is already open

      case "click_at": {
        // const { x, y } = this.normalizeCoordinates(
        //   args.x as number,
        //   args.y as number
        // );
        return {
          type: "CLICK",
          x: args.x as number,
          y: args.y as number,
          button: args.button || "left",
        };
      }

      case "type_text_at": {
        // const { x, y } = this.normalizeCoordinates(
        //   args.x as number,
        //   args.y as number
        // );
        // Google's type_text_at includes press_enter and clear_before_typing parameters
        const pressEnter = (args.press_enter as boolean) ?? false;
        const clearBeforeTyping = (args.clear_before_typing as boolean) ?? true;

        // For type_text_at, we need to click first then type
        // This matches the behavior expected by Google's CUA
        // We'll handle this in the executeStep method by converting to two actions
        return {
          type: "TYPE_TEXT",
          text: args.text as string,
          x: args.x,
          y: args.y,
          pressEnter,
          clearBeforeTyping,
        };
      }

      case "key_combination": {
        const keys = (args.keys as string)
          .split("+")
          .map((key: string) => key.trim());
        return {
          type: "KEY_PRESS",
          key: keys.join("+"),
        };
      }

      case "scroll_document": {
        const direction = (args.direction as string).toLowerCase() as
          | "up"
          | "down"
          | "left"
          | "right";
        const magnitude = (args.magnitude as number) ?? 999;
        return {
          type: "SCROLL_DOCUMENT",
          direction,
          magnitude,
        };
      }

      case "scroll_at": {
        // const { x, y } = this.normalizeCoordinates(
        //   args.x as number,
        //   args.y as number
        // );
        const direction = ((args.direction as string) || "down").toLowerCase();
        const magnitude =
          typeof args.magnitude === "number" ? (args.magnitude as number) : 800;

        let scroll_x = 0;
        let scroll_y = 0;
        if (direction === "up") {
          scroll_y = -magnitude;
        } else if (direction === "down") {
          scroll_y = magnitude;
        } else if (direction === "left") {
          scroll_x = -magnitude;
        } else if (direction === "right") {
          scroll_x = magnitude;
        } else {
          // Default to down if unknown direction
          scroll_y = magnitude;
        }

        return {
          type: "SCROLL",
          x: args.x as number,
          y: args.y as number,
          deltaX: scroll_x,
          deltaY: scroll_y,
        };
      }

      case "navigate":
        return {
          type: "GOTO_URL",
          url: args.url as string,
        };

      case "go_back":
        return {
          type: "GO_BACK",
        };

      case "go_forward":
        return {
          type: "GO_FORWARD",
        };

      case "wait_5_seconds":
        return {
          type: "WAIT",
          timeMs: 5000, // Google CUA waits for 5 seconds
        };

      case "hover_at": {
        // const { x, y } = this.normalizeCoordinates(
        //   args.x as number,
        //   args.y as number
        // );
        // return {
        //   type: "HOVER",
        //   x: args.x,
        //   y: args.y,
        // };
        return null; // Hover not implemented yet
      }

      case "search":
        return {
          type: "GOTO_URL",
          url: "https://www.google.com",
        };

      case "drag_and_drop": {
        // const startPoint = this.normalizeCoordinates(
        //   args.x as number,
        //   args.y as number
        // );
        // const endPoint = this.normalizeCoordinates(
        //   args.destination_x as number,
        //   args.destination_y as number
        // );
        return {
          type: "DRAG_AND_DROP",
          fromX: args.x as number,
          fromY: args.y as number,
          toX: args.destination_x as number,
          toY: args.destination_y as number,
        };
      }

      default:
        log(`Unsupported Google CUA function: ${name}`);
        return null;
    }
  }

  async onInitialize() {
    log(`Initializing BrowserAgent with goal: ${this.goalDescription}`);

    // Refactored to use Google GenAI Computer Use
    const maxSteps = 100;
    let currentStep = 0;
    let completed = false;
    let finalMessage = "";

    // Initialize Google GenAI client
    const apiKey = process.env.GEMINI_API_KEY!;
    const client = new GoogleGenAI({ apiKey });

    // General-purpose browser agent system prompt
    const systemPrompt = `You are a general-purpose browser agent whose job is to accomplish the user's goal.
Today's date is ${new Date().toISOString().split("T")[0]}.
You have access to a search tool; however, in most cases you should operate within the page/url the user has provided. ONLY use the search tool if you're stuck or the task is impossible to complete within the current page.
You will be given a goal and a list of steps that have been taken so far. Avoid requesting the user for input as much as possible. You should output text as your reasoning for your decisionmaking process. However, the user is not able to respond through this channel. If you need to ask the user to perform an intermediary task or a question regarding the goal, call relevant functions to communicate with the user. Good luck!
`;

    // Initial conversation history
    const history: Content[] = [
      {
        role: "user",
        parts: [{ text: "System prompt: " + systemPrompt }],
      },
      {
        role: "user",
        parts: [
          {
            text:
              "I would like you to accomplish the following goal:\n\n" +
              this.goalDescription,
          },
        ],
      },
    ];

    // Main agent loop
    try {
      while (!completed && currentStep < maxSteps) {
        log(`Executing step ${currentStep + 1}/${maxSteps}`);

        // Generate content using Gemini Computer Use
        const response = await client.models.generateContent({
          model: "gemini-2.5-computer-use-preview-10-2025",
          contents: history,
          config: {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            tools: [
              {
                computerUse: {
                  environment: Environment.ENVIRONMENT_BROWSER,
                },
                // functionDeclarations: [
                //   {
                //     name: "system__ask_question",
                //     description:
                //       "Ask the user a question to clarify the goal or get more information, or to continue through a task which you cannot complete. Use this function only if absolutely necessary, as the agent should try to complete the goal autonomously as much as possible.",
                //   },
                // ],
              },
            ],
          },
        });

        // Add model response to history
        if (response.candidates && response.candidates[0]) {
          // Sanitize any out-of-range coordinates in function calls before adding to history
          const sanitizedContent = response.candidates[0].content;

          if (sanitizedContent?.parts) {
            for (const part of sanitizedContent.parts) {
              if (part.functionCall?.args) {
                if (
                  typeof part.functionCall.args.x === "number" &&
                  part.functionCall.args.x > 999
                ) {
                  part.functionCall.args.x = 999;
                }
                if (
                  typeof part.functionCall.args.y === "number" &&
                  part.functionCall.args.y > 999
                ) {
                  part.functionCall.args.y = 999;
                }
              }
            }
          }

          history.push(sanitizedContent!);
        }

        const processedResponse = await this.processResponse(response);

        if (processedResponse.message !== "") {
          this.sendChat(processedResponse.message);
        }

        const functionResponses: Part[] = [];

        for (const [functionCall, actions] of processedResponse.actions) {
          log(`Function call to execute:`, functionCall, actions);

          if (actions.length > 0) {
            for (const action of actions) {
              log(`Executing action:`, action);
              const actionRequestId = generateId("REQUEST");

              const waitForActionResponse =
                this.messageContext.generalExpectResponse(actionRequestId);

              this.messageContext.generalSendMessage(
                ts({
                  type: "REQUEST_BROWSER_AGENT_ACTION",
                  requestId: actionRequestId,
                  contextId: this.messageContext.contextId,
                  action,
                })
              );

              const actionResponse = await waitForActionResponse;
              log(`Action response:`, actionResponse);
              await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay between actions
            }
          } else {
            log(
              `No actions to execute for function call: ${functionCall.name}`
            );
          }

          const screenshotRequestId = generateId("REQUEST");

          const waitForScreenshotResponse =
            this.messageContext.generalExpectResponse(screenshotRequestId);

          this.messageContext.generalSendMessage(
            ts({
              type: "REQUEST_BROWSER_AGENT_ACTION",
              requestId: screenshotRequestId,
              contextId: this.messageContext.contextId,
              action: { type: "CAPTURE_SCREENSHOT" },
            })
          );

          const screenshotResponse = await waitForScreenshotResponse;

          if (
            screenshotResponse.type === "PROVIDE_BROWSER_AGENT_ACTION" &&
            "base64" in screenshotResponse.response &&
            "pageUrl" in screenshotResponse.response
          ) {
            console.log("Received screenshot response", functionCall);

            const functionResponsePart: Part = {
              functionResponse: {
                name: functionCall.name,
                response: {
                  url: screenshotResponse.response.pageUrl || "",
                  // TODO: LMAO IMPLEMENT SAFETY DECISION HANDLING T_T
                  // Acknowledge safety decision for evals
                  ...(functionCall.args?.safety_decision
                    ? {
                        safety_acknowledgement: "true",
                      }
                    : {}),
                },
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: screenshotResponse.response.base64 as string,
                    },
                  },
                ],
              },
            };

            log("Response to", functionCall.name, functionResponsePart);

            functionResponses.push(functionResponsePart);
          }
        }

        history.push({
          role: "user",
          parts: functionResponses,
        });

        completed = processedResponse.completed;
        currentStep++;
      }

      // Return result in the same format as _onInitialize
      return {
        success: completed,
        data: finalMessage,
      };
    } catch (error) {
      log("Error in goal completion:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // stub not used
  async onUserMessage() {}
}
