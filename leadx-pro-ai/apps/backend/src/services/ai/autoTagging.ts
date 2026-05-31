import { IScrapedCompany, LeadPriority } from '@leadx/shared';
import { getOpenAIClient, isAIEnabled } from './aiClient';
import { retry } from '../../utils/retry';
import { env } from '../../config/environment';
import { logger } from '../../utils/logger';

interface ClassificationResult {
  tags: string[];
  priority: LeadPriority;
}

/**
 * Uses AI to classify a company, assigning relevant industry/operational tags and mapping it to a priority (high, medium, low).
 */
export async function classifyLead(company: IScrapedCompany): Promise<ClassificationResult> {
  const defaultResult: ClassificationResult = {
    tags: [],
    priority: LeadPriority.LOW,
  };

  if (!isAIEnabled()) {
    return defaultResult;
  }

  const client = getOpenAIClient();

  const prompt = `You are a sales operations lead routing model. Analyze the following lead details and assign appropriate business tags (e.g., "SaaS", "Local Business", "E-commerce", "Needs Outreach", "High Intent") and assign a routing priority ("high", "medium", or "low").

Priority criteria:
- high: The lead has both an email and a phone/whatsapp, belongs to a defined commercial category, and is a strong B2B prospect.
- medium: The lead has either an email or a phone, and has basic contact info.
- low: The lead has minimal contact info (no email, or only a website URL) or is uncategorized.

You MUST respond with a valid JSON object ONLY. Do not wrap the JSON in code block ticks or write any other text. Follow this schema exactly:
{
  "tags": ["Tag1", "Tag2"],
  "priority": "high" | "medium" | "low"
}

Lead Details:
Company Name: ${company.company_name}
Category/Niche: ${company.category || 'N/A'}
Email: ${company.email || 'N/A'}
Phone: ${company.phone || 'N/A'}
WhatsApp: ${company.whatsapp || 'N/A'}
Website: ${company.website || 'N/A'}
Address: ${company.address || 'N/A'}
Confidence Score: ${company.confidence_score}
`;

  try {
    logger.debug(`Classifying and tagging lead: ${company.company_name}`);
    const response = await retry(() => client.chat.completions.create({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an accurate classifier that only outputs valid raw JSON matching the requested schema.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 150,
      response_format: { type: 'json_object' }
    }));

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Received empty response from classification');
    }

    const parsed = JSON.parse(content);
    
    // Normalize tags to array of strings
    const tags = Array.isArray(parsed.tags) 
      ? parsed.tags.map((t: any) => String(t).trim()).filter(Boolean)
      : [];
      
    // Map priority safely
    let priority = LeadPriority.LOW;
    if (parsed.priority === 'high') priority = LeadPriority.HIGH;
    else if (parsed.priority === 'medium') priority = LeadPriority.MEDIUM;
    else if (parsed.priority === 'low') priority = LeadPriority.LOW;

    return { tags, priority };
  } catch (error: any) {
    logger.warn(`Failed to classify lead with AI: ${error.message}. Falling back to default low priority.`, { error });
    
    // Simple heuristic-based fallback so flow never crashes
    const tags: string[] = [];
    if (company.category) tags.push(company.category);
    if (company.email && company.phone) {
      return { tags, priority: LeadPriority.HIGH };
    } else if (company.email || company.phone) {
      return { tags, priority: LeadPriority.MEDIUM };
    }
    return { tags, priority: LeadPriority.LOW };
  }
}
