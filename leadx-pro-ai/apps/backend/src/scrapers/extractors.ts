import { REGEX_PATTERNS, DISPOSABLE_EMAIL_DOMAINS } from '@leadx/shared';

/**
 * Extract emails from text content
 */
export function extractEmails(text: string): string[] {
  const matches = text.match(REGEX_PATTERNS.EMAIL) || [];
  const emails = [...new Set(matches.map((e) => e.toLowerCase().trim()))];

  // Filter out common false positives and disposable emails
  return emails.filter((email) => {
    const domain = email.split('@')[1];

    // Skip image/file extensions mistaken as emails
    if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|ttf)$/i.test(email)) return false;

    // Skip disposable email domains
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) return false;

    // Skip example domains
    if (['example.com', 'test.com', 'localhost', 'domain.com', 'email.com'].includes(domain)) return false;

    // Must have valid TLD
    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2) return false;

    return true;
  });
}

/**
 * Extract phone numbers from text content
 */
export function extractPhones(text: string): string[] {
  const matches = text.match(REGEX_PATTERNS.PHONE) || [];
  return [...new Set(
    matches
      .map((p) => p.trim())
      // Skip scientific notation or obvious floating point numbers (like 8.4024E+11)
      .filter((p) => !/[eE]\+/.test(p) && !/\d+\.\d+/.test(p))
      .map((p) => p.replace(/[\s.()-]/g, '').trim())
      .filter((p) => {
        // Find the matching unformatted version in the original matched strings
        const original = matches.find((m) => m.replace(/[\s.()-]/g, '').trim() === p) || '';
        const isFormatted = /[\s.()-]/.test(original);

        // If it's a short sequence (7 to 9 digits), it must have formatting to be trusted
        if (p.length >= 7 && p.length <= 9) {
          return isFormatted;
        }

        // Long sequences (10 to 15 digits) are highly likely to be real phone numbers even if unformatted
        return p.length >= 10 && p.length <= 15;
      })
      .filter((p) => !/^(0{5,}|1{5,}|2{5,}|3{5,}|4{5,}|5{5,}|6{5,}|7{5,}|8{5,}|9{5,})/.test(p)) // Not repeated digits
  )];
}

/**
 * Extract LinkedIn URLs from text/HTML
 */
export function extractLinkedIn(text: string): string | null {
  const matches = text.match(REGEX_PATTERNS.LINKEDIN);
  if (!matches || matches.length === 0) return null;

  // Prefer company pages over personal profiles
  const companyPage = matches.find((m) => m.includes('/company/'));
  return companyPage || matches[0];
}

/**
 * Extract Facebook URLs from text/HTML
 */
export function extractFacebook(text: string): string | null {
  const matches = text.match(REGEX_PATTERNS.FACEBOOK);
  if (!matches || matches.length === 0) return null;

  // Skip common non-company Facebook URLs
  return matches.find((m) =>
    !m.includes('/sharer') &&
    !m.includes('/share') &&
    !m.includes('/plugins') &&
    !m.includes('/dialog')
  ) || null;
}

/**
 * Extract WhatsApp numbers/links from text
 */
export function extractWhatsApp(text: string): string | null {
  if (!text) return null;

  // Try to match WhatsApp links (e.g. api.whatsapp.com/send?phone=XXX or wa.me/XXX) inside the HTML/text string
  const linkMatches = text.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\d+)/i);
  if (linkMatches && linkMatches[1]) {
    return linkMatches[1];
  }

  // Fallback to text-based matching (e.g. "whatsapp: +123456789")
  const matches = text.match(REGEX_PATTERNS.WHATSAPP);
  if (!matches || matches.length === 0) return null;

  const match = matches[0];
  const numberMatch = match.match(/\d+/);
  return numberMatch ? numberMatch[0] : null;
}

/**
 * Extract physical addresses from text
 * Uses heuristic patterns for common address formats
 */
export function extractAddress(text: string): string | null {
  // Clean the text first
  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Address indicators to validate generic matches
  const addressKeywords = [
    /\b(?:street|st|avenue|ave|boulevard|blvd|drive|dr|lane|ln|road|rd|way|court|ct|circle|cir|place|pl|broadway|square|sq|highway|hwy|suite|ste|floor|fl|building|bldg|p\.?o\.?\s*box)\b/i,
    /\b(?:alberta|bc|manitoba|nb|nl|ns|nt|nunavut|ontario|pe|qc|sk|yt)\b/i,
    /\b(?:vic|nsw|qld|wa|sa|tas|act|nt)\b\s+\d{4}\b/i,
    /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/,
    /\b[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]\b/i,
    /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/i
  ];

  // Specific high-confidence address patterns
  const highConfidencePatterns = [
    // US-style: 123 Main St, City, ST 12345
    /\d{1,5}\s[\w\s.-]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Way|Court|Ct|Circle|Cir|Place|Pl|Broadway)[\s,]+[\w\s.-]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/i,
    // PO Box: PO Box 123, City, ST 12345
    /(?:P\.?O\.?\s*Box)\s+\d+[\s,]+[\w\s.-]+,?\s*[A-Z]{2}\s*\d{5}/i,
  ];

  // First, check if any high-confidence pattern matches
  for (const pattern of highConfidencePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      return match[0].trim().substring(0, 500);
    }
  }

  // Next, fall back to general pattern but validate with address keywords
  // Number + Street/City + optional commas
  const generalPattern = /\d{1,5}\s[\w\s.-]{3,50}(?:,\s*[\w\s.-]+){1,4}/;
  const match = cleanText.match(generalPattern);
  if (match) {
    const candidate = match[0].trim();
    // Validate that the candidate contains at least one address keyword/indicator
    const hasIndicator = addressKeywords.some((kw) => kw.test(candidate));
    if (hasIndicator) {
      // Make sure it doesn't look like conversational sentences (skip if it contains common non-address words)
      const conversationalWords = /\b(?:experience|skills|salary|team|benefits|responsibilities|qualification|requirements|join|work|full-time|part-time|scientists|members|partnerships|visibility|sponsor|matching|premium|coaching|hands|events)\b/i;
      if (!conversationalWords.test(candidate)) {
        return candidate.substring(0, 500);
      }
    }
  }

  return null;
}

/**
 * Extract company name from page title and meta tags
 */
export function extractCompanyName(
  title: string,
  metaTitle?: string,
  ogTitle?: string,
  h1?: string,
): string {
  // Priority: OG title > meta title > h1 > page title
  const candidates = [ogTitle, metaTitle, h1, title].filter(Boolean) as string[];

  for (const candidate of candidates) {
    // Clean common suffixes
    const cleaned = candidate
      .replace(/\s*[-|–—]\s*.+$/, '') // Remove " - Company tagline"
      .replace(/\s*\|.+$/, '') // Remove " | Company"
      .replace(/Home\s*[-|]?\s*/i, '') // Remove "Home - "
      .replace(/Welcome to\s*/i, '') // Remove "Welcome to "
      .trim();

    if (cleaned.length >= 2 && cleaned.length <= 200) {
      return cleaned;
    }
  }

  return title.substring(0, 200).trim();
}

/**
 * Extract all URLs from HTML content
 */
export function extractUrls(html: string, baseUrl: string): string[] {
  const urlPattern = /href=["']([^"']+)["']/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(html)) !== null) {
    try {
      const url = new URL(match[1], baseUrl).href;
      if (url.startsWith('http')) {
        urls.push(url);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return [...new Set(urls)];
}
