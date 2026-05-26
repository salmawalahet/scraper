import puppeteer, { Browser, Page } from 'puppeteer';
import { USER_AGENTS } from '@leadx/shared';
import { logger } from '../utils/logger';

class BrowserManager {
  private browser: Browser | null = null;
  private activePagesCount = 0;
  private maxPages = 5;

  /**
   * Get or create shared browser instance
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      logger.info('Launching new browser instance');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--window-size=1920,1080',
          '--single-process',
        ],
        defaultViewport: { width: 1920, height: 1080 },
      });

      this.browser.on('disconnected', () => {
        logger.warn('Browser disconnected');
        this.browser = null;
        this.activePagesCount = 0;
      });
    }

    return this.browser;
  }

  /**
   * Create a new page with anti-detection settings
   */
  async newPage(): Promise<Page> {
    while (this.activePagesCount >= this.maxPages) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    this.activePagesCount++;

    // Random user agent
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(ua);

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Block unnecessary resources for speed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const blockedTypes = ['image', 'stylesheet', 'font', 'media'];
      if (blockedTypes.includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    return page;
  }

  /**
   * Close a page and decrement counter
   */
  async closePage(page: Page): Promise<void> {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch {
      // Page already closed
    }
    this.activePagesCount = Math.max(0, this.activePagesCount - 1);
  }

  /**
   * Close the browser entirely
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.activePagesCount = 0;
      logger.info('Browser closed');
    }
  }

  /**
   * Get pool stats
   */
  getStats() {
    return {
      isActive: !!this.browser && this.browser.connected,
      activePages: this.activePagesCount,
      maxPages: this.maxPages,
    };
  }
}

export const browserManager = new BrowserManager();
