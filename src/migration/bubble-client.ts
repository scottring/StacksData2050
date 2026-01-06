import { config } from './config.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('BubbleClient');

export interface BubbleListResponse<T> {
  cursor: number;
  results: T[];
  count: number;
  remaining: number;
}

export interface BubbleRecord {
  _id: string;
  'Created Date': string;
  'Modified Date': string;
  'Created By'?: string;
  Slug?: string;
  [key: string]: unknown;
}

export type EntityType =
  | 'company'
  | 'user'
  | 'tag'
  | 'question'
  | 'sheet'
  | 'answer'
  | 'request'
  | 'sheetstatuses';

class BubbleClient {
  private baseUrl: string;
  private token: string;
  private maxRetries = 5;
  private baseDelay = 1000; // 1 second base delay for retries

  constructor() {
    this.baseUrl = config.bubble.apiUrl;
    this.token = config.bubble.apiToken;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<Response> {
    const response = await fetch(url, options);

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      if (retryCount >= this.maxRetries) {
        throw new Error(`Rate limited after ${this.maxRetries} retries`);
      }

      const delay = this.baseDelay * Math.pow(2, retryCount);
      logger.warn(`Rate limited. Waiting ${delay}ms before retry ${retryCount + 1}/${this.maxRetries}`);
      await this.sleep(delay);
      return this.fetchWithRetry(url, options, retryCount + 1);
    }

    // Retry on server errors (5xx)
    if (response.status >= 500 && retryCount < this.maxRetries) {
      const delay = this.baseDelay * Math.pow(2, retryCount);
      logger.warn(`Server error ${response.status}. Waiting ${delay}ms before retry ${retryCount + 1}/${this.maxRetries}`);
      await this.sleep(delay);
      return this.fetchWithRetry(url, options, retryCount + 1);
    }

    return response;
  }

  async list<T extends BubbleRecord>(
    entityType: EntityType,
    options: { cursor?: number; limit?: number } = {}
  ): Promise<BubbleListResponse<T>> {
    const { cursor = 0, limit = 100 } = options;

    const url = new URL(`${this.baseUrl}/api/1.1/obj/${entityType}`);
    url.searchParams.set('cursor', cursor.toString());
    url.searchParams.set('limit', limit.toString());

    const response = await this.fetchWithRetry(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bubble API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return data.response as BubbleListResponse<T>;
  }

  async getById<T extends BubbleRecord>(
    entityType: EntityType,
    id: string
  ): Promise<T | null> {
    const url = `${this.baseUrl}/api/1.1/obj/${entityType}/${id}`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bubble API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return data.response as T;
  }

  async *iterateAll<T extends BubbleRecord>(
    entityType: EntityType,
    batchSize = 100
  ): AsyncGenerator<T[], void, unknown> {
    let cursor = 0;
    let remaining = 1; // Start with 1 to enter the loop

    while (remaining > 0) {
      const response = await this.list<T>(entityType, { cursor, limit: batchSize });

      yield response.results;

      remaining = response.remaining;
      cursor += response.results.length;

      // Delay between batches to avoid rate limiting (50ms = max 20 req/s)
      if (remaining > 0) {
        await this.sleep(50);
      }
    }
  }

  async countAll(entityType: EntityType): Promise<number> {
    const response = await this.list(entityType, { limit: 1 });
    return response.count + response.remaining;
  }
}

export const bubbleClient = new BubbleClient();
