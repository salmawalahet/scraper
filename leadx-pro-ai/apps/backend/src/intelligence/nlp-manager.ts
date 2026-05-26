import natural from 'natural';
import compromise from 'compromise';
import keywordExtractor from 'keyword-extractor';
import { ICreateCompany, LeadPriority, CompanySize, CATEGORY_KEYWORDS, BUSINESS_CATEGORIES } from '@leadx/shared';
import { logger } from '../utils/logger';

// Initialize TF-IDF classifier
const TfIdf = natural.TfIdf;
const classifier = new natural.BayesClassifier();

// Train the classifier with category keywords
let isClassifierTrained = false;

function trainClassifier() {
  if (isClassifierTrained) return;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Add multiple training samples per category
    classifier.addDocument(keywords.join(' '), category);
    // Add shorter samples too for better coverage
    for (let i = 0; i < keywords.length; i += 3) {
      classifier.addDocument(keywords.slice(i, i + 3).join(' '), category);
    }
  }

  classifier.train();
  isClassifierTrained = true;
  logger.info('NLP classifier trained successfully');
}

class IntelligenceEngine {
  constructor() {
    trainClassifier();
  }

  /**
   * Analyze a company and enrich with intelligence data
   */
  async analyze(company: ICreateCompany, pageHtml: string): Promise<ICreateCompany> {
    const result = { ...company };

    try {
      // Step 1: Classify business category
      if (!result.category) {
        result.category = this.classifyCategory(result, pageHtml);
      }

      // Step 2: Calculate confidence score
      result.confidence_score = this.calculateConfidence(result);

      // Step 3: Determine lead priority
      result.lead_priority = this.determineLeadPriority(result);

      // Step 4: Auto-tag
      result.tags = this.generateTags(result, pageHtml);

      // Step 5: Estimate company size from page content
      if (!result.company_size || result.company_size === 'unknown') {
        result.company_size = this.estimateCompanySize(pageHtml);
      }
    } catch (error) {
      logger.warn('Intelligence analysis partially failed', { error });
    }

    return result;
  }

  /**
   * Classify business category using TF-IDF and Bayes
   */
  private classifyCategory(company: ICreateCompany, html: string): string {
    // Extract text to analyze
    const textContent = this.extractAnalysisText(company, html);

    // Method 1: Bayes classifier
    const bayesResult = classifier.classify(textContent);

    // Method 2: TF-IDF keyword matching
    const tfidf = new TfIdf();
    tfidf.addDocument(textContent);

    let bestCategory = bayesResult;
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let categoryScore = 0;

      keywords.forEach((keyword) => {
        tfidf.tfidfs(keyword, (i, measure) => {
          categoryScore += measure;
        });
      });

      if (categoryScore > bestScore) {
        bestScore = categoryScore;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(company: ICreateCompany): number {
    let score = 0;
    const weights = {
      email: 20,
      phone: 15,
      website: 10,
      linkedin: 15,
      facebook: 5,
      whatsapp: 5,
      address: 10,
      category: 10,
      companyName: 10,
    };

    if (company.email) score += weights.email;
    if (company.phone) score += weights.phone;
    if (company.website) score += weights.website;
    if (company.linkedin) score += weights.linkedin;
    if (company.facebook) score += weights.facebook;
    if (company.whatsapp) score += weights.whatsapp;
    if (company.address) score += weights.address;
    if (company.category && company.category !== 'Other') score += weights.category;
    if (company.company_name && company.company_name.length > 3) score += weights.companyName;

    return Math.min(100, score);
  }

  /**
   * Determine lead priority based on data completeness and quality
   */
  private determineLeadPriority(company: ICreateCompany): LeadPriority {
    const score = company.confidence_score || 0;

    if (score >= 80 && company.email && company.phone) return LeadPriority.HIGH;
    if (score >= 50 && (company.email || company.phone)) return LeadPriority.MEDIUM;
    return LeadPriority.LOW;
  }

  /**
   * Generate auto-tags from analyzed content
   */
  private generateTags(company: ICreateCompany, html: string): string[] {
    const tags: string[] = [];
    const text = this.extractAnalysisText(company, html).toLowerCase();

    // Extract keywords
    const keywords = keywordExtractor.extract(text, {
      language: 'english',
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true,
    });

    // Add tags based on presence of data
    if (company.email) tags.push('has-email');
    if (company.phone) tags.push('has-phone');
    if (company.whatsapp) tags.push('has-whatsapp');
    if (company.linkedin) tags.push('has-linkedin');
    if (company.facebook) tags.push('has-facebook');
    if (company.address) tags.push('has-address');

    // Add category as tag
    if (company.category) tags.push(company.category.toLowerCase().replace(/\s+/g, '-'));

    // Add top keywords as tags (max 5)
    const topKeywords = keywords
      .filter((k) => k.length > 3)
      .slice(0, 5);
    tags.push(...topKeywords);

    // NLP entity detection using compromise
    try {
      const doc = compromise(text);
      const organizations = doc.organizations().out('array') as string[];
      if (organizations.length > 0) {
        tags.push('org-detected');
      }

      const places = doc.places().out('array') as string[];
      if (places.length > 0) {
        tags.push('location-found');
      }
    } catch {
      // compromise may fail on some text, that's fine
    }

    return [...new Set(tags)].slice(0, 15);
  }

  /**
   * Estimate company size from page content
   */
  private estimateCompanySize(html: string): CompanySize {
    const text = html.replace(/<[^>]*>/g, ' ').toLowerCase();

    const sizePatterns = [
      { pattern: /\b(enterprise|fortune|global|multinational|10000|5000)\b/i, size: CompanySize.ENTERPRISE },
      { pattern: /\b(200|300|500|large team|large company)\b/i, size: CompanySize.LARGE },
      { pattern: /\b(50|100|growing team|mid-size|midsize)\b/i, size: CompanySize.MEDIUM },
      { pattern: /\b(small team|startup|small business|boutique)\b/i, size: CompanySize.STARTUP },
      { pattern: /\b(20|30|team of \d{2})\b/i, size: CompanySize.SMALL },
    ];

    for (const { pattern, size } of sizePatterns) {
      if (pattern.test(text)) return size;
    }

    return CompanySize.UNKNOWN;
  }

  /**
   * Build analysis text from company data and page content
   */
  private extractAnalysisText(company: ICreateCompany, html: string): string {
    const pageText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    return [
      company.company_name,
      company.address || '',
      pageText,
    ].join(' ');
  }
}

export const intelligenceEngine = new IntelligenceEngine();
