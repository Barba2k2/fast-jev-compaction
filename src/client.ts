import { buildJevRequest, keyName, parseJevResponse, type JevProvider } from './request.js';
import type { JevAsker, JevQuestions, JevResponse, JevState } from './types.js';

export interface JevClientOptions {
  /** Defaults to `openrouter` when only `OPENROUTER_API_KEY` is set, else `typesafe`. */
  provider?: JevProvider;
  /** Defaults to `process.env.TYPESAFE_API_KEY`, or `OPENROUTER_API_KEY` on OpenRouter. */
  apiKey?: string;
  /** Defaults to `jev-latest`, or `typesafe/jev-1.13` on OpenRouter. */
  model?: string;
  /** Defaults to the System One endpoint. */
  baseUrl?: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** Asks Jev over HTTP with the global `fetch` (or an injected one). */
export class JevClient implements JevAsker {
  private readonly provider: JevProvider;
  private readonly apiKey: string;
  private readonly model: string | undefined;
  private readonly baseUrl: string | undefined;
  private readonly fetcher: typeof fetch;

  constructor(options: JevClientOptions = {}) {
    this.provider = options.provider
      ?? (!process.env.TYPESAFE_API_KEY && process.env.OPENROUTER_API_KEY ? 'openrouter' : 'typesafe');
    this.apiKey = options.apiKey
      ?? (this.provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : process.env.TYPESAFE_API_KEY)
      ?? '';
    this.model = options.model;
    this.baseUrl = options.baseUrl;
    this.fetcher = options.fetch ?? fetch;
  }

  async ask(state: JevState, questions: JevQuestions): Promise<JevResponse> {
    if (!this.apiKey) throw new Error(`${keyName(this.provider)} is not configured`);
    const request = buildJevRequest(
      { apiKey: this.apiKey, model: this.model, baseUrl: this.baseUrl, provider: this.provider },
      state,
      questions,
    );
    const response = await this.fetcher(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    return parseJevResponse(response.status, response.ok, await response.text());
  }
}
