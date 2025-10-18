Here’s a curated summary (with links) of how to use **AI SDK v5** (by Vercel) for your use-cases: generating text, structured objects, calling tools, persisting messages/arrays, and using Gemini. If you want runnable sample code in your stack (Node.js, React, etc.), I can help you build that.

---

## Key docs / reference sources

* API Reference (v5) — core functions, types, streaming, etc. ([ai-sdk.dev][1])
* Migration guide: v4 → v5 (explains changes in tool calls, message types) ([ai-sdk.dev][2])
* Chatbot Message Persistence guide (for `useChat`, saving & loading) ([ai-sdk.dev][3])
* Guides: “Get started with Gemini 2.5” (how to use Gemini with AI SDK) ([ai-sdk.dev][4])

---

## Core concepts in AI SDK v5 you need to internalize

Before diving into code, here are the main design shifts in v5 that you must adapt to:

1. **UIMessage vs ModelMessage**

   * `UIMessage` is what you store / render (contains `parts`, metadata, etc.)
   * Before sending to the LLM, you convert UI → `ModelMessage` using `convertToModelMessages`.
   * This separation keeps your persisted state richer. ([ai-sdk.dev][2])

2. **Tool calls are now streaming by default**

   * In v4 there was `toolCallStreaming`; in v5, streaming tool calls are always enabled (i.e. `toolCallStreaming` option removed) ([ai-sdk.dev][2])
   * You define tools via `tool({...})` or dynamic tools using `dynamicTool(...)` ([ai-sdk.dev][2])

3. **Parts typing for tool invocations**

   * Instead of generic `tool-invocation`, parts now carry `tool-${toolName}` typed names. ([ai-sdk.dev][2])
   * This gives you stronger type safety and easier UI rendering.

4. **Streaming is via SSE backbone (for UI side)**

   * The v5 UI side streams messages via Server-Sent Events (SSE). ([DEV Community][5])
   * Even if you aren’t using streaming now, it's embedded in architecture.

5. **onFinish callback to persist messages**

   * After a chat completes, you use `onFinish({ messages })` to persist UI messages. ([ai-sdk.dev][3])
   * The `messages` passed are already in UI format; you don’t need conversions. ([Vercel][6])

6. **Custom UIMessage generics**

   * You can parameterize `UIMessage<Meta, DataParts, Tools>` to carry app-specific metadata, data parts, and tool types. ([Vercel][6])

---

## How to *generate text*

```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';  // or other provider

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Explain the Monty Hall problem succinctly',
});
console.log(text);
```

* You can also provide additional options (temperature, etc.) via `providerOptions`.
* If you want raw access (e.g. with tool calls), there's support for `rawResponse` settings. ([GitHub][7])

---

## How to *generate structured objects*

If you want JSON / structured output constrained by a schema:

```ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const recipeSchema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(z.object({ name: z.string(), quantity: z.string() })),
    steps: z.array(z.string()),
  }),
});

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: recipeSchema,
  prompt: 'Generate a lasagna recipe in JSON format.',
});
console.log(object);
```

* `streamObject` is also supported (for streaming structured data) in cases where you want incremental parts. ([Vercel][8])
* The schema enforcement ensures your output matches expected shape. ([Vercel][8])

---

## Calling *tools*

You can define tools (with input & output schema) and pass them in your `generateText` or `streamText` call. Then the LLM can legitimately “invoke” these tools.

Example:

```ts
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get weather by city name',
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ city: z.string(), temperature: z.number(), conditions: z.string() }),
  execute: async ({ city }) => {
    // your fetch or API call
    return { city, temperature: 70, conditions: 'sunny' };
  },
});

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'What is the weather in San Francisco today?',
  tools: { getWeather: weatherTool },
});
console.log(text);
```

Notes / caveats:

* Because tool calls stream by default, your LLM may issue intermediate outputs. ([ai-sdk.dev][2])
* You can mix “static” and dynamic tools: for tools whose schema you don’t know at compile time, use `dynamicTool(...)`. ([ai-sdk.dev][2])
* In multi-step tools (agentic loops) there is `onStepFinish` or other hooks to inspect tool calls. ([ai-sdk.dev][2])

---

## Message persistence / managing "arrays of messages"

You asked about keeping persistent arrays of messages (i.e. chat history). Here’s how v5 supports that in practice, plus best practices.

### UI-side: `useChat`

On client-side UI (React or similar), you use `useChat(...)` from `@ai-sdk/react` (part of AI SDK UI). Example:

```ts
import { useChat } from '@ai-sdk/react';

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
});
```

* `messages` is your UIMessage array. You render UI based on that. ([ai-sdk.dev][9])
* `sendMessage(...)` triggers a new message to server and updates state. ([ai-sdk.dev][10])
* The `transport` layer is customizable — you can decide whether to send full history or incremental. ([ai-sdk.dev][3])

### Server-side / persistence

In your API endpoint (e.g. `/api/chat`), you'd do something like:

```ts
import { convertToModelMessages, streamText, generateMessageId } from 'ai';

export async function POST(req) {
  const { messages: uiMessages } = await req.json();
  // Optionally: assign server-side IDs if needed
  const modelMsgs = convertToModelMessages(uiMessages);

  const result = streamText({
    model: openai('gpt-4o'),
    messages: modelMsgs,
    tools: { … },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: uiMessages,
    onFinish: async ({ messages }) => {
      // persist UIMessages (with parts & metadata)
      await chatStore.save(messages);
    },
  });
}
```

* `toUIMessageStreamResponse` wraps transformation so that client gets UIMessages back. ([ai-sdk.dev][3])
* `originalMessages` tells it what prior UI state was.
* The `onFinish` callback gives you final UIMessages to persist.
* You can generate message IDs using `generateMessageId` (to ensure consistency across saves) on server side. ([Upstash: Serverless Data Platform][11])

### Best practices & tips

* Don’t always send full chat history from client: in large chats it’s costly. Instead, send only new message, and reload history server-side. The guide from Upstash shows how to use `prepareSendMessagesRequest` to only send last message. ([Upstash: Serverless Data Platform][11])
* Store UIMessages in a fast store (Redis, DB, etc.), so load + resume is cheap. ([Upstash: Serverless Data Platform][11])
* When migrating from older versions (v4), note changes in the `parts` schema and tool invocation states. There is a GitHub discussion on migrating existing data. ([GitHub][12])
* Be careful about client navigation and route changes: some users reported `messages` being inconsistent after route reloads with same chat ID. ([GitHub][13])

---

## How to use **Gemini** with AI SDK v5

Gemini (by Google) is supported as a provider in AI SDK, so you can plug it into `generateText`, `streamText`, tool calls, etc.

From the docs (“Get started with Gemini 2.5”):

```ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const { text } = await generateText({
  model: google('gemini-2.5-flash'),
  prompt: 'Explain Hilbert spaces in layman’s terms',
});
```

* You can also control reasoning (“thinking”) via `providerOptions.google.thinkingConfig`, e.g.:

```ts
const { text, reasoning } = await generateText({
  model: google('gemini-2.5-flash'),
  prompt: 'Sum of first 10 primes?',
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingBudget: 8192,
        includeThoughts: true,
      },
    },
  },
});
```

* Gemini supports tool usage just like other providers: you can supply `tools` in the same call. ([ai-sdk.dev][4])
* In the “Market Research Agent with Gemini and AI SDK” guide, they show using Gemini + Google Search to generate reports, structured data, etc. ([Google AI for Developers][14])

Also note:

* Gemini long context: Gemini’s models support context windows up to 1 million tokens (for some variants). The same code you use (for text, structured, tools) will work without modifications for large context. ([Google AI for Developers][15])
* The Google Gen AI SDK docs and the “OpenAI compatibility” docs show how to use Gemini via existing OpenAI client patterns. ([Google AI for Developers][16])

---

If you like, I can generate a full working sample (frontend + backend) using v5, showing all your asked features. Do you want me to build that for your stack (say Next.js + Node)?

[1]: https://ai-sdk.dev/docs/reference?utm_source=chatgpt.com "API Reference - AI SDK"
[2]: https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0?utm_source=chatgpt.com "Migrate AI SDK 4.0 to 5.0"
[3]: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence?utm_source=chatgpt.com "Chatbot Message Persistence"
[4]: https://ai-sdk.dev/cookbook/guides/gemini-2-5?utm_source=chatgpt.com "Guides: Get started with Gemini 2.5"
[5]: https://dev.to/yigit-konur/vercel-ai-sdk-v5-internals-part-5-powering-generative-ui-the-sse-backbone-of-v5-fc7?utm_source=chatgpt.com "Vercel AI SDK v5 Internals - Part 5 — Powering Generative UI with ..."
[6]: https://vercel.com/blog/ai-sdk-5?utm_source=chatgpt.com "AI SDK 5"
[7]: https://github.com/vercel/ai?utm_source=chatgpt.com "vercel/ai - GitHub"
[8]: https://vercel.com/docs/ai-sdk?utm_source=chatgpt.com "AI SDK - Vercel"
[9]: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat?utm_source=chatgpt.com "AI SDK UI: useChat"
[10]: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot?utm_source=chatgpt.com "AI SDK UI: Chatbot"
[11]: https://upstash.com/blog/ai-sdk-chat-history?utm_source=chatgpt.com "Saving AI SDK v5 Chat Messages in Redis"
[12]: https://github.com/vercel/ai/discussions/7988?utm_source=chatgpt.com "Migrating Messages to AI SDK v5 UIMessage Format #7988"
[13]: https://github.com/vercel/ai/issues/7201?utm_source=chatgpt.com "`messages` property is different even on same useChat id"
[14]: https://ai.google.dev/gemini-api/docs/vercel-ai-sdk-example?utm_source=chatgpt.com "Market Research Agent with Gemini and the AI SDK by Vercel"
[15]: https://ai.google.dev/gemini-api/docs/long-context?utm_source=chatgpt.com "Long context | Gemini API - Google AI for Developers"
[16]: https://ai.google.dev/gemini-api/docs/openai?utm_source=chatgpt.com "OpenAI compatibility | Gemini API - Google AI for Developers"
