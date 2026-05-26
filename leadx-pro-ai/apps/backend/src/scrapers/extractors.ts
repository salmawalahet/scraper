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
      .map((p) => p.replace(/[\s.-]/g, '').trim())
      .filter((p) => p.length >= 7 && p.length <= 15) // Valid phone length
      .filter((p) => !/^(0{5,}|1{5,}|2{5,})/.test(p)) // Not repeated digits
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

  // Common address patterns
  const addressPatterns = [
    // US-style: 123 Main St, City, ST 12345
    /\d{1,5}\s[\w\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Way|Court|Ct|Circle|Cir|Place|Pl)[\s,]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/i,
    // General: Number + Street + City + State/Country
    /\d{1,5}\s[\w\s]{3,30}(?:,\s*[\w\s]+){1,3}/,
  ];

  for (const pattern of addressPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      return match[0].trim().substring(0, 500);
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
