import { createWebSearchClient } from "../webSearchClient.ts";
import type {
  WebSearchAuth,
  AnswerQuestionParams,
  AnswerResponse,
} from "../types.ts";

export async function answerQuestion(
  params: AnswerQuestionParams,
  auth: WebSearchAuth
): Promise<AnswerResponse> {
  const client = createWebSearchClient(auth);
  const exa = client.getClient();

  // Use answer method to get direct answer with citations
  const { answer, citations, requestId } = await exa.answer(params.query, {
    text: true,
  });

  return {
    answer: typeof answer === "string" ? answer : JSON.stringify(answer),
    citations,
    requestId,
  };
}
