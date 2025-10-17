# Project Description

Celesta is an AI browser-assistant designed to convert natural language prompts into actionable sequential workflows. It has the following (non existent) components.

Mock a bunch of integrations for say, Gmail, Calendar, YouTube, Web Search, Notion, etc. You don't need to implement the actual API calls, just mock the tool interfaces and have the ExecutionAgent call them. The focus is on the orchestration logic. Use gemini-2.5-flash for everything.


## ExecutionContext: Manages the state and context of the task execution.

It should store the original prompt, current state of tasks, results from executed tasks, and provide methods to update and retrieve this information. Whatever information is necessary by the coordinator to develop a cohesive plan. There should also be a way to generate a cohesive response to the user of this complex task. This is because some tasks may be like "summarize what I have to do today" which would draw from sources like gmail, calendar, and ulimately require a cohesive response.

As defined in the function below, there should be a current state of the execution, which can be "running", "completed", or "failed".


## CoordinationAgent: Determines the next task to execute based on the current context.

It is designed to return the "next task" to execute based on the past tasks, their results, and the overall goal defined in the prompt. It should be the one to break down the complex task into smaller, manageable subtasks as well as mark the execution context as "completed" or "failed" when appropriate. you may need to define a Task interface/type for this purpose. It should be pretty self-contained and not depend on other agents. A task should have a description, goal, and any other metadata you think is necessary for the execution agent.

## ToolFilterAgent: Selects the appropriate tools needed for each task.

There is a very expansive list of integrations/tools available, like Google Search, YouTube, Wolfram Alpha, GMAIL, Notion, etc. so this agent is crucial to narrow that down significantly. It should also be self-contained.

Use an LLM to analyze the task and determine which tools are most relevant for its execution. It should return a list of tool identifiers or instances that the ExecutionAgent can use. It is better to err on the side of too many tools than too few, as the ExecutionAgent can always choose to not use some of them. However, we definitely want managability. Maybe you should ask for a structured output of tool and reason for it. So that the LLM is forced to think through its choices.

Use Zod schemas for defining/mocking tools with the AI sdk.

## ExecutionAgent: Executes the tasks using the selected tools.

It will have access to the tools. This agent shouldn't directly communicate with the other two, but it should have the spec as defined below. When a "run" call is made, it should automatically update the execution context with the results of the task execution mapped to the task in question. We can worry about error handling later, but at least have a way to mark a task as failed in the execution context if something goes wrong.

This agent should return success/failure status, boolean. As well as a natural language description of the outcome (or failure reason) of the task, for each task execution back to the main loop.

## MessagePipe: Facilitates communication between agents and human, allowing users to get real-time updates on LLM progress and for LLMs to communicate with humans.

The other agents should send updates through this pipe. They can also ask clarifying questions to the human user through this pipe. Feel free to mock the message pipe logic, just design the API spec in a class.

Upon receiving a message, just log it to the console for now. When the agent requests a message, you should prompt in the console as well. This will allow us to test the overall flow without building a full UI. Add an initial prompt for the complex task at the beginning and pass it into the running function defined below.

## executeComplexTask:

The main function, executeComplexTask, orchestrates the workflow by initializing the agents and managing the execution loop until all tasks are completed or a failure occurs.

None of these components exist yet, so this is just a high-level design outline. You should create the components, define their interfaces, and implement the logic as per the requirements. Use the AI SDK for any LLM interactions needed within the agents. 
