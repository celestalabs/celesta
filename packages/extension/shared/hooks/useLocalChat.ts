import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { useChat } from "@ai-sdk/react";
import { convertToModelMessages, DefaultChatTransport, streamText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
})("gemini-2.5-flash");

const customFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
  const m = JSON.parse(init?.body as string);
  const result = streamText({
    model: google,
    messages: convertToModelMessages(m.messages),
    abortSignal: init?.signal as AbortSignal | undefined,
  });
  return result.toUIMessageStreamResponse();
};

export const useLocalChat = () => {
  return useChat({
    transport: new DefaultChatTransport({
      fetch: customFetch,
    }),
  });
};
