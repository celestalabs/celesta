import {
  BaseAgent,
  browserAgentActionSchema,
  browserAgentActionSchemaByName,
  generateId,
  ts,
} from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import { generateObject, generateText, tool, type ToolSet } from "ai";
import z from "zod";

type BrowserAgentConfig = {
  messageContext: MessageContext<BrowserAgent>;
  goalDescription: string;
};

export class BrowserAgent extends BaseAgent {
  goalDescription: string;
  tools: ToolSet = {};

  constructor({ messageContext, goalDescription }: BrowserAgentConfig) {
    super(messageContext);
    this.goalDescription = goalDescription;
  }

  onInitialize() {
    return new Promise<
      { success: true; reasoning: string } | { success: false; error: string }
    >(async (resolve, reject) => {
      try {
        // add all browser tools
        for (const [actionName, inputSchema] of Object.entries(
          browserAgentActionSchemaByName
        )) {
          this.tools[actionName] = tool({
            description:
              inputSchema.description ??
              actionName.replaceAll("_", " ").toLowerCase(),
            inputSchema: inputSchema as z.ZodObject,
            execute: (input) =>
              new Promise((resolve, reject) => {
                try {
                  const parsedInput = browserAgentActionSchema.parse(input);
                  const requestId = generateId("REQUEST");

                  this.messageContext
                    .generalExpectResponse(requestId)
                    .then((response) => {
                      response.type === "PROVIDE_BROWSER_AGENT_ACTION"
                        ? resolve(response.response)
                        : reject(
                            new Error(
                              "Invalid response received from browser agent."
                            )
                          );
                    })
                    .catch((err) => {
                      reject(new Error("Response timed out. " + err));
                    });

                  this.messageContext.generalSendMessage(
                    ts({
                      type: "REQUEST_BROWSER_AGENT_ACTION",
                      requestId,
                      contextId: this.messageContext.contextId,
                      action: parsedInput,
                    })
                  );
                } catch (error) {
                  if (error instanceof z.ZodError) {
                    reject(
                      new Error(
                        `Invalid input for action ${actionName}: ${error}`
                      )
                    );
                  } else {
                    reject(
                      new Error(
                        `Received error during execution of action ${actionName}: ${error}`
                      )
                    );
                  }
                }
              }),
          });
        }

        // init goal oriented browsing
        const { text } = await generateText({
          prompt: `You are a goal-oriented browsing agent. Your task is to use browser actions to achieve the user's stated goal as efficiently and accurately as possible. Consider the current context, available tools, and any constraints. At each step, reason about the best action to take, and only mark the goal as completed when you are certain it has been achieved. If the goal cannot be completed, provide a clear explanation. Be concise, logical, and avoid unnecessary actions.
          
          The user has provided the following goal for your to complete using the browser:
          
          # ${this.goalDescription}.
          
          Upon completion of the task, respond with clear details as to whether the goal was completed or not, along with reasoning for that decision.`,
          model: this.model,
          tools: this.tools,
        });

        const { object: responseObject } = await generateObject({
          model: this.model,
          prompt:
            "You are an expert evaluator of task completion. A browser use agent has just completed a goal, and has provided a response regarding whether the goal was completed or not, along with reasoning for that decision. Based on the provided response, determine if the goal was indeed completed successfully or not. Be objective and consider all aspects of the response in your evaluation. Your output should be a structured object indicating whether the goal was completed and the reasoning behind your evaluation.\n\nHere is the agent's response:\n\n" +
            text,
          schema: z.object({
            goalCompleted: z
              .boolean()
              .describe("Whether the browsing goal has been completed"),
            goalCompletionInformation: z
              .string()
              .describe(
                "Reasoning regarding why the goal was completed, else why it was not completed or cannot be completed"
              ),
          }),
        });

        if (responseObject.goalCompleted) {
          resolve({
            success: true,
            reasoning: responseObject.goalCompletionInformation,
          });
        } else {
          reject({
            success: false,
            error: responseObject.goalCompletionInformation,
          });
        }
      } catch (err) {
        reject({ success: false, error: (err as Error).message });
      }
    });
  }

  // stub not used
  async onUserMessage() {}
}
