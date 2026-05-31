import OpenAI from 'openai';
import { env } from '../../config/environment';
import { logger } from '../../utils/logger';

let openaiInstance: OpenAI | null = null;

function getApiKey(): string {
  return env.OPENROUTER_API_KEY.trim() || env.OPENAI_API_KEY.trim();
}

export function getOpenAIClient(): OpenAI {
  if (!isAIEnabled()) {
    throw new Error('AI features are disabled or OpenAI API key is missing.');
  }

  if (!openaiInstance) {
    logger.info(`Initializing OpenAI client with model: ${env.AI_MODEL} and baseURL: ${env.AI_BASE_URL}`);
    openaiInstance = new OpenAI({
      apiKey: getApiKey(),
      baseURL: env.AI_BASE_URL,
      defaultHeaders: {
        'User-Agent': 'LeadX-Pro-AI/1.0',
        'X-Title': env.APP_NAME,
      },
    });
  }

  return openaiInstance;
}

export function isAIEnabled(): boolean {
  const isEnabled = env.AI_ENABLED === 'true';
  const hasKey = getApiKey().length > 0;
  return isEnabled && hasKey;
}
