import { ICreateCompany, VerificationStatus, WebsiteStatus, LeadPriority, DISPOSABLE_EMAIL_DOMAINS } from '@leadx/shared';
import { isValidEmail } from '@leadx/shared';
import axios from 'axios';
import { logger } from '../../utils/logger';

/**
 * Full validation pipeline for extracted company data
 */
class ValidationPipeline {
  /**
   * Process a company through all validation steps
   * Returns null if the company should be rejected
   */
  async process(company: ICreateCompany): Promise<ICreateCompany | null> {
    let result = { ...company };

    // Step 1: Validate & clean email
    if (result.email) {
      result.email = this.validateEmail(result.email);
    }

    // Step 2: Validate & normalize phone
    if (result.phone) {
      result.phone = this.validatePhone(result.phone);
    }

    // Step 3: Validate website URL
    if (result.website) {
      result.website = this.normalizeWebsite(result.website);
    }

    // Step 4: Check for spam/fake business
    if (this.isSpamBusiness(result.company_name)) {
      logger.debug(`Rejected spam business: ${result.company_name}`);
      return null;
    }

    // Step 5: Validate company name
    if (!this.isValidCompanyName(result.company_name)) {
      return null;
    }

    // Step 6: Set verification status
    result.verification_status = this.determineVerificationStatus(result);

    return result;
  }

  /**
   * Validate email format and check for disposable domains
   */
  private validateEmail(email: string): string | null {
    email = email.toLowerCase().trim();

    if (!isValidEmail(email)) return null;

    const domain = email.split('@')[1];

    // Check disposable
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) return null;

    // Check for obviously fake patterns
    if (/^(test|admin|info|noreply|no-reply|support|sales|contact)@/.test(email)) {
      // These are often generic, but still valid — keep but flag
      return email;
    }

    return email;
  }

  /**
   * Validate and normalize phone number
   */
  private validatePhone(phone: string): string | null {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.length < 7 || cleaned.length > 15) return null;

    // Check for obviously fake numbers
    if (/^(\d)\1{6,}$/.test(cleaned)) return null; // All same digit
    if (/^(0{7,}|1{7,})/.test(cleaned)) return null; // All zeros/ones
    if (/^(123456|654321)/.test(cleaned)) return null; // Sequential

    return cleaned;
  }

  /**
   * Normalize website URL
   */
  private normalizeWebsite(url: string): string {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname.replace(/\/+$/, '')}`;
    } catch {
      return url;
    }
  }

  /**
   * Check if a company name looks like spam
   */
  private isSpamBusiness(name: string): boolean {
    const spamPatterns = [
      /^(test|example|sample|demo|dummy|lorem|ipsum)/i,
      /^(aaa|bbb|xxx|zzz)/i,
      /\b(free|discount|cheap|buy now|click here|subscribe)\b/i,
      /^(page \d|untitled|no title|none|n\/a)/i,
      /^\d+$/,
      /^[^a-zA-Z]*$/,
    ];

    return spamPatterns.some((pattern) => pattern.test(name.trim()));
  }

  /**
   * Check if a company name is valid
   */
  private isValidCompanyName(name: string): boolean {
    if (!name || name.trim().length < 2) return false;
    if (name.length > 300) return false;
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) return false;
    return true;
  }

  /**
   * Determine verification status based on available data
   */
  private determineVerificationStatus(company: ICreateCompany): VerificationStatus {
    let score = 0;

    if (company.email) score += 30;
    if (company.phone) score += 20;
    if (company.website) score += 15;
    if (company.linkedin) score += 15;
    if (company.address) score += 10;
    if (company.facebook) score += 5;
    if (company.whatsapp) score += 5;

    if (score >= 60) return VerificationStatus.VERIFIED;
    if (score >= 30) return VerificationStatus.UNVERIFIED;
    return VerificationStatus.PENDING;
  }
}

export const validationPipeline = new ValidationPipeline();
