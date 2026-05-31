import { IScrapedCompany } from '@leadx/shared';
import { retry } from '../../utils/retry';
import { getOpenAIClient, isAIEnabled } from './aiClient';
import { env } from '../../config/environment';
import { logger } from '../../utils/logger';

/**
 * Generates a professional 2-3 sentence business summary for a company.
 */
export async function generateLeadSummary(company: IScrapedCompany): Promise<string> {
  if (!isAIEnabled()) {
    throw new Error('AI features are disabled. Please enable AI and configure your API key.');
  }

  const client = getOpenAIClient();

  const prompt = `You are an elite sales intelligence analyst. Analyze this scraped company and generate a professional, concise 2-3 sentence summary of what the company does, their primary offering, and why they are a compelling business lead. Keep it highly objective, informative, and formatted as a paragraph. Do not include placeholders or conversational preamble.

Company Name: ${company.company_name}
Category/Niche: ${company.category || 'N/A'}
Website: ${company.website || 'N/A'}
Address: ${company.address || 'N/A'}
Description Context: Category is "${company.category || ''}" and they are located at "${company.address || ''}".`;

  try {
    logger.debug(`Generating summary for company: ${company.company_name}`);
    const response = await retry(() => client.chat.completions.create({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You generate accurate and concise business summaries.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 150,
    }));

    const summary = response.choices[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error('Received empty response from OpenAI');
    }

    return summary;
  } catch (error: any) {
    logger.error(`Error generating lead summary: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Generates a conversion-focused B2B cold email outreach draft for a company.
 */
export async function generateColdEmail(company: IScrapedCompany, senderName: string = 'Sales Team'): Promise<string> {
  if (!isAIEnabled()) {
    throw new Error('AI features are disabled. Please enable AI and configure your API key.');
  }

  const client = getOpenAIClient();

  const prompt = `You are a world-class copywriter specializing in high-conversion B2B cold email outreach. Write a compelling, highly personalized cold email draft to the following company under 120 words.
Keep the style professional, conversational, and direct (no generic corporate fluff).
The email must include:
1. A brief hook that references their category/niche ("${company.category || 'your business'}") or region/location ("${company.address || 'your area'}").
2. A single strong value proposition demonstrating how we can help them scale or streamline operations.
3. A clear, low-friction Call to Action (CTA) asking for a brief chat.
4. Professional signature block.

Use bracket placeholders for things you do not know (e.g. [Prospect Name]), but DO use the real information provided below wherever possible. Do not include subject line or conversational preamble. Start directly with "Hi [Prospect Name]," or "Hi ${company.company_name} Team,".

Company Name: ${company.company_name}
Category/Niche: ${company.category || 'N/A'}
Website: ${company.website || 'N/A'}
Sender Name: ${senderName}
`;

  try {
    logger.debug(`Generating cold email for company: ${company.company_name}`);
    const response = await retry(() => client.chat.completions.create({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You write high-converting, personalized B2B cold emails.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 250,
    }));

    const email = response.choices[0]?.message?.content?.trim();
    if (!email) {
      throw new Error('Received empty response from OpenAI');
    }

    return email;
  } catch (error: any) {
    logger.error(`Error generating cold email: ${error.message}`, { error });
    throw error;
  }
}
