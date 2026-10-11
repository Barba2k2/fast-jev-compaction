import type { JevAnswer, JevQuestions, JevResponse, JevState } from './types.js';

export const SYSTEM_ONE_URL = 'https://api.typesafe.ai/v1/systemone';
export const DEFAULT_MODEL = 'jev-latest';
/** OpenRouter serves Jev itself here, with the System One request shape. */
export const DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions';
/** `typesafe/jev-latest` does not resolve on OpenRouter; a dated id does. */
export const OPENROUTER_MODEL = 'typesafe/jev-1.13';

export type JevProvider = 'typesafe' | 'openrouter';

export function providerUrl(provider: JevProvider | undefined): string {
  return provider === 'openrouter' ? DECISIONS_URL : SYSTEM_ONE_URL;
}

export function keyName(provider: JevProvider | undefined): string {
  return provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'TYPESAFE_API_KEY';
}

export function providerModel(provider: JevProvider | undefined): string {
  return provider === 'openrouter' ? OPENROUTER_MODEL : DEFAULT_MODEL;
}

export interface JevRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}

/** The HTTP request for one Jev call, for any fetch-like transport. */
export function buildJevRequest(
  params: {
    apiKey: string;
    model?: string;
    baseUrl?: string;
    provider?: JevProvider;
  },
  state: JevState,
  questions: JevQuestions,
): JevRequest {
  return {
    url: params.baseUrl ?? providerUrl(params.provider),
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model ?? providerModel(params.provider),
      state,
      questions,
    }),
  };
}

/** Validates a Jev response body; throws on anything but an `answers` object. */
export function parseJevResponse(
  status: number,
  ok: boolean,
  text: string,
): JevResponse {
  if (!ok) {
    throw new Error(`Jev request failed (${status}): ${text.slice(0, 200)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Jev returned malformed JSON');
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    !('answers' in parsed) ||
    parsed.answers === null ||
    typeof parsed.answers !== 'object'
  ) {
    throw new Error('Jev response is missing answers');
  }
  return parsed as JevResponse;
}

/** The `noul` probability of one answer; throws when it is not there. */
export function noulAnswer(
  answers: Record<string, JevAnswer>,
  name: string,
): number {
  const answer = answers[name];
  // The OpenRouter decisions wire format names the same value `probability`.
  const value = answer && 'noul' in answer ? answer.noul
    : answer && 'probability' in answer ? answer.probability
    : undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid Jev answer for ${name}`);
  }
  return value;
}
