import * as cheerio from 'cheerio';
import axios from 'axios';
import { IScrapeJob, ICreateCompany, CompanySize, VerificationStatus, WebsiteStatus, LeadPriority, USER_AGENTS } from '@leadx/shared';
import { browserManager } from './browser-manager';
import {
  extractEmails, extractPhones, extractLinkedIn,
  extractFacebook, extractWhatsApp, extractAddress,
  extractCompanyName, extractUrls,
} from './extractors';
import { validationPipeline } from '../services/validation/pipeline';
import { intelligenceEngine } from '../intelligence/nlp-manager';
import { companyService } from '../services/company.service';
import { jobService } from '../services/job.service';
import { logger } from '../utils/logger';
import { normalizeUrl } from '@leadx/shared';
import { db } from '../database/pool';

interface ScrapeResult {
  totalFound: number;
  totalVerified: number;
}

interface ProgressCallback {
  (progress: { percentage: number; currentUrl: string; totalFound: number; totalVerified: number }): void;
}

class ScraperManager {
  /**
   * Run a complete scraping job
   */
  async runJob(job: IScrapeJob, onProgress: ProgressCallback): Promise<ScrapeResult> {
    let totalFound = 0;
    let totalVerified = 0;
    const visitedUrls = new Set<string>();
    const urlsToVisit: string[] = [];
    const maxPages = job.config.maxPages || 50;
    const maxLeads = job.config.maxLeads || 500;

    // Check if target_url is a search engine URL or a search query is present
    const isSearchUrl = job.target_url.includes('duckduckgo.com') || job.target_url.includes('google.com') || !job.target_url.startsWith('http');
    
    if (isSearchUrl || job.search_query) {
      const baseQuery = job.search_query || job.name;
      logger.info(`Performing multi-query search engine discovery for: "${baseQuery}"`, { jobId: job.id });
      
      // Generate multiple smart search queries for broader, higher-quality coverage
      const searchQueries = this.generateSearchQueries(baseQuery);
      const allDiscoveredUrls = new Set<string>();

      for (const query of searchQueries) {
        try {
          // Strategy 1: DDG Regular (JS-rendered) — gives clean, direct URLs
          const ddgRegularUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
          const { html: regularHtml } = await this.fetchPage(ddgRegularUrl, 'puppeteer');
          if (regularHtml) {
            const regularUrls = this.extractDDGRegularUrls(regularHtml);
            if (regularUrls.length > 0) {
              logger.info(`[DDG Regular] "${query}" → found ${regularUrls.length} URLs`, { jobId: job.id });
              regularUrls.forEach(u => allDiscoveredUrls.add(u));
            } else {
              // Strategy 2: Fallback to DDG HTML version
              const ddgHtmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
              const { html: htmlVersion } = await this.fetchPage(ddgHtmlUrl, 'puppeteer');
              if (htmlVersion) {
                const htmlUrls = this.extractSearchUrls(htmlVersion);
                logger.info(`[DDG HTML] "${query}" → found ${htmlUrls.length} URLs`, { jobId: job.id });
                htmlUrls.forEach(u => allDiscoveredUrls.add(u));
              }
            }
          }
        } catch (error: any) {
          logger.warn(`Search query "${query}" failed: ${error.message}`, { jobId: job.id });
        }
        // Delay between searches to avoid rate-limiting
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
      }

      const uniqueUrls = Array.from(allDiscoveredUrls).slice(0, 50);
      logger.info(`Total unique URLs discovered across all queries: ${uniqueUrls.length}`, { jobId: job.id });
      urlsToVisit.push(...uniqueUrls);
    }

    // IMPORTANT: Never fall back to a search engine URL as a scrape target
    if (urlsToVisit.length === 0) {
      if (job.target_url.startsWith('http') && !this.isSearchEngineUrl(job.target_url)) {
        urlsToVisit.push(job.target_url);
      } else {
        logger.error(`No URLs discovered for job ${job.id}. Search engines may be blocking requests.`, { jobId: job.id });
      }
    }

    logger.info(`Starting scrape job ${job.id}`, { targetUrl: job.target_url, urlsCount: urlsToVisit.length, maxPages, maxLeads });

    while (urlsToVisit.length > 0 && visitedUrls.size < maxPages && totalFound < maxLeads) {
      const url = urlsToVisit.shift()!;
      const normalizedUrl = normalizeUrl(url);

      if (visitedUrls.has(normalizedUrl)) continue;
      visitedUrls.add(normalizedUrl);

      try {
        logger.debug(`Scraping: ${url}`);

        // Fetch page content
        const { html, finalUrl } = await this.fetchPage(url, job.config.browser);

        if (!html) {
          try {
            await db.execute(
              `INSERT INTO job_results (job_id, url, status, error_message) VALUES (?, ?, ?, ?)`,
              [job.id, url, 'skipped', 'Empty HTML page returned']
            );
          } catch (e) {
            // Ignore DB log error
          }
          continue;
        }

        // Extract data from HTML
        const companies = await this.extractFromPage(html, finalUrl, job.id);

        if (companies.length > 0) {
          // Validate and score each company
          const validCompanies: ICreateCompany[] = [];
          for (const company of companies) {
            const validated = await validationPipeline.process(company);
            if (validated) {
              // Run intelligence scoring
              const scored = await intelligenceEngine.analyze(validated, html);
              validCompanies.push(scored);
            }
          }

          // Check for duplicates and batch insert
          const newCompanies: ICreateCompany[] = [];
          for (const company of validCompanies) {
            const isDuplicate = await companyService.isDuplicate(
              company.email || null,
              company.company_name,
              company.website || null,
            );
            if (!isDuplicate) {
              newCompanies.push(company);
            }
          }

          if (newCompanies.length > 0) {
            await companyService.batchCreate(newCompanies);
            totalFound += newCompanies.length;
            totalVerified += newCompanies.filter(
              (c) => c.verification_status === VerificationStatus.VERIFIED,
            ).length;

            // Update job counts in DB
            await jobService.incrementCounts(job.id, newCompanies.length,
              newCompanies.filter((c) => c.verification_status === VerificationStatus.VERIFIED).length,
            );
          }
        }

        // Log successful scrape to job_results table
        try {
          await db.execute(
            `INSERT INTO job_results (job_id, url, status, raw_data) VALUES (?, ?, ?, ?)`,
            [
              job.id,
              url,
              'success',
              JSON.stringify({
                scrapedAt: new Date().toISOString(),
                leadsExtracted: companies.length,
                verifiedLeads: companies.filter(c => c.verification_status === VerificationStatus.VERIFIED).length
              })
            ]
          );
        } catch (dbErr: any) {
          logger.warn(`Failed to write to job_results table: ${dbErr.message}`);
        }

        // Discover new URLs on the same domain
        if (visitedUrls.size < maxPages) {
          const newUrls = this.discoverUrls(html, finalUrl, visitedUrls);
          urlsToVisit.push(...newUrls);
        }

        // Report progress
        const percentage = Math.round((visitedUrls.size / maxPages) * 100);
        onProgress({
          percentage: Math.min(percentage, 99),
          currentUrl: url,
          totalFound,
          totalVerified,
        });
      } catch (error: any) {
        logger.warn(`Failed to scrape ${url}`, { error: error.message });
        try {
          await db.execute(
            `INSERT INTO job_results (job_id, url, status, error_message) VALUES (?, ?, ?, ?)`,
            [job.id, url, 'failed', error.message]
          );
        } catch (dbErr: any) {
          logger.warn(`Failed to write failure log to job_results: ${dbErr.message}`);
        }
        continue;
      }

      // Small delay to be polite
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
    }

    onProgress({ percentage: 100, currentUrl: '', totalFound, totalVerified });

    return { totalFound, totalVerified };
  }

  /**
   * Fetch page HTML using Puppeteer or Cheerio+Axios
   */
  private async fetchPage(
    url: string,
    browser: string,
  ): Promise<{ html: string; finalUrl: string }> {
    if (browser === 'cheerio') {
      return this.fetchWithAxios(url);
    }
    try {
      return await this.fetchWithPuppeteer(url);
    } catch (puppeteerErr: any) {
      logger.warn(`Puppeteer fetch failed for ${url}, falling back to Axios/Cheerio...`, { error: puppeteerErr.message });
      try {
        return await this.fetchWithAxios(url);
      } catch (axiosErr: any) {
        logger.error(`Axios fallback also failed for ${url}`, { error: axiosErr.message });
        throw new Error(`Browser fetch failed: ${puppeteerErr.message}. Fallback fetch failed: ${axiosErr.message}`);
      }
    }
  }

  /**
   * Fetch with Puppeteer (for JS-rendered pages)
   */
  private async fetchWithPuppeteer(url: string): Promise<{ html: string; finalUrl: string }> {
    const page = await browserManager.newPage();
    try {
      // Search engine pages need networkidle2 to wait for JS-rendered results
      const isSearchPage = this.isSearchEngineUrl(url);
      const waitStrategy = isSearchPage ? 'networkidle2' as const : 'domcontentloaded' as const;
      const dynamicWait = isSearchPage ? 4000 : 2000;

      await page.goto(url, { waitUntil: waitStrategy, timeout: 30000 });
      await new Promise((r) => setTimeout(r, dynamicWait)); // Let dynamic content load
      const html = await page.content();
      const finalUrl = page.url();
      return { html, finalUrl };
    } finally {
      await browserManager.closePage(page);
    }
  }

  /**
   * Fetch with Axios + Cheerio (lightweight)
   */
  private async fetchWithAxios(url: string): Promise<{ html: string; finalUrl: string }> {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
    });
    return { html: response.data, finalUrl: response.request?.res?.responseUrl || url };
  }

  /**
   * Check if a URL belongs to a search engine (should not be scraped for leads)
   */
  private isSearchEngineUrl(url: string): boolean {
    const u = url.toLowerCase();
    return u.includes('duckduckgo.com') || u.includes('google.com') || u.includes('bing.com') || u.includes('yahoo.com') || u.includes('yandex');
  }

  /**
   * Extract company data from page HTML
   */
  private async extractFromPage(html: string, url: string, jobId: number): Promise<ICreateCompany[]> {
    // Skip search engine pages — these are not company websites
    if (this.isSearchEngineUrl(url)) {
      logger.debug(`Skipping search engine page: ${url}`);
      return [];
    }

    const $ = cheerio.load(html);
    const textContent = $('body').text();

    // Extract data
    const emails = extractEmails(textContent);
    const phones = extractPhones(textContent);
    const linkedin = extractLinkedIn(html);
    const facebook = extractFacebook(html);
    const whatsapp = extractWhatsApp(html);
    const address = extractAddress(textContent);

    // Extract company name from meta
    const title = $('title').text().trim();
    const metaTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();
    const companyName = extractCompanyName(title, ogSiteName, metaTitle, h1);

    if (!companyName || companyName.length < 2) return [];

    // Create a company record for each unique email, or one with just the URL
    const companies: ICreateCompany[] = [];

    if (emails.length > 0) {
      for (const email of emails.slice(0, 3)) { // Max 3 emails per page
        companies.push({
          job_id: jobId,
          company_name: companyName,
          email,
          phone: phones[0] || null,
          whatsapp,
          website: url,
          linkedin,
          facebook,
          address,
          source_url: url,
        });
      }
    } else {
      // Still create a lead even without email
      companies.push({
        job_id: jobId,
        company_name: companyName,
        phone: phones[0] || null,
        whatsapp,
        website: url,
        linkedin,
        facebook,
        address,
        source_url: url,
      });
    }

    return companies;
  }

  /**
   * Discover new URLs to scrape from the same domain
   */
  private discoverUrls(html: string, baseUrl: string, visited: Set<string>): string[] {
    try {
      const baseDomain = new URL(baseUrl).hostname;
      // Safeguard: Never discover links on search engine pages recursively
      if (baseDomain.includes('duckduckgo.com') || baseDomain.includes('google.com') || baseDomain.includes('bing.com')) {
        return [];
      }
      const allUrls = extractUrls(html, baseUrl);

      return allUrls
        .filter((url) => {
          try {
            const urlDomain = new URL(url).hostname;
            const normalized = normalizeUrl(url);

            return (
              urlDomain === baseDomain &&
              !visited.has(normalized) &&
              !url.includes('#') &&
              !url.match(/\.(pdf|zip|doc|xls|png|jpg|jpeg|gif|css|js|xml)$/i) &&
              !url.includes('mailto:') &&
              !url.includes('tel:') &&
              url.length < 500
            );
          } catch {
            return false;
          }
        })
        .slice(0, 20); // Limit new URLs per page
    } catch {
      return [];
    }
  }

  /**
   * Extract URLs from DDG Regular (JS-rendered) search results.
   * Uses data-testid and article selectors which give clean, direct URLs.
   */
  private extractDDGRegularUrls(html: string): string[] {
    const $ = cheerio.load(html);
    const urls: string[] = [];

    // DDG Regular uses data-testid="result-title-a" for result links
    $('a[data-testid="result-title-a"]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href && href.startsWith('http') && !this.isSearchEngineUrl(href)) {
        urls.push(href);
      }
    });

    // Also check article a tags as fallback
    $('article a[href^="http"]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href && !this.isSearchEngineUrl(href) && !this.isNonBusinessUrl(href)) {
        urls.push(href);
      }
    });

    return Array.from(new Set(urls)).slice(0, 20);
  }

  /**
   * Extract organic external links from DuckDuckGo HTML (lite) results.
   * Handles the //duckduckgo.com/l/?uddg= redirect format.
   */
  private extractSearchUrls(html: string): string[] {
    const $ = cheerio.load(html);
    const urls: string[] = [];

    // Check for CAPTCHA / bot detection — if present, return empty
    if (html.includes('anomaly-modal') || html.includes('challenge-form')) {
      logger.warn('DuckDuckGo returned CAPTCHA page — skipping this query');
      return [];
    }

    // Parse .result__a elements — DDG HTML lite result links
    $('.result__a').each((_, elem) => {
      let href = $(elem).attr('href');
      if (!href) return;

      // DDG HTML uses format: //duckduckgo.com/l/?uddg=<encoded_url>&rut=...
      if (href.includes('duckduckgo.com/l/?') || href.startsWith('/l/?')) {
        try {
          // Normalize: add https: if it starts with //
          const fullHref = href.startsWith('//') ? 'https:' + href : 'https://duckduckgo.com' + href;
          const urlObj = new URL(fullHref);
          const uddg = urlObj.searchParams.get('uddg');
          if (uddg) href = uddg;
        } catch {
          // Ignore malformed URLs
        }
      }

      if (href.startsWith('http') && !this.isSearchEngineUrl(href) && !this.isNonBusinessUrl(href)) {
        urls.push(href);
      }
    });

    // Fallback: scan all <a> tags for external business URLs
    if (urls.length === 0) {
      $('a').each((_, elem) => {
        let href = $(elem).attr('href');
        if (!href) return;

        // Handle //duckduckgo.com/l/ redirects anywhere on the page
        if (href.includes('duckduckgo.com/l/?') || href.startsWith('/l/?')) {
          try {
            const fullHref = href.startsWith('//') ? 'https:' + href : 'https://duckduckgo.com' + href;
            const urlObj = new URL(fullHref);
            const uddg = urlObj.searchParams.get('uddg');
            if (uddg) href = uddg;
          } catch {}
        }

        if (href.startsWith('http') && !this.isSearchEngineUrl(href) && !this.isNonBusinessUrl(href)) {
          urls.push(href);
        }
      });
    }

    return Array.from(new Set(urls)).slice(0, 20);
  }

  /**
   * Check if a URL is a non-business site that should be excluded from lead scraping
   */
  private isNonBusinessUrl(url: string): boolean {
    const u = url.toLowerCase();
    return (
      u.includes('wikipedia.org') ||
      u.includes('w3.org') ||
      u.includes('facebook.com') ||
      u.includes('twitter.com') ||
      u.includes('linkedin.com') ||
      u.includes('youtube.com') ||
      u.includes('instagram.com') ||
      u.includes('reddit.com') ||
      u.includes('pinterest.com') ||
      u.includes('tiktok.com') ||
      u.includes('apple.com/app') ||
      u.includes('play.google.com') ||
      u.includes('duck.ai') ||
      u.includes('substack.com')
    );
  }

  /**
   * Generate multiple diverse search queries to find more relevant URLs.
   * Takes a base query like "Marketing Agency New York" and produces
   * targeted variants that surface company websites with contact info.
   */
  private generateSearchQueries(baseQuery: string): string[] {
    // Parse the base query — it may be like "Marketing Agency New York"
    // or just a field + location pair
    const q = baseQuery.trim();

    const queries: string[] = [
      // 1. Base query as-is (broadest)
      q,
      // 2. Target pages with contact information
      `${q} contact email phone`,
      // 3. Target "top" or "best" list pages — these list many firms at once
      `best ${q} firms near me`,
      // 4. Target directory-style listings
      `${q} companies list directory`,
      // 5. Target "about us" style pages with business details
      `${q} about us address website`,
    ];

    // Return unique queries (in case something overlaps)
    return [...new Set(queries)];
  }
}

export const scraperManager = new ScraperManager();
