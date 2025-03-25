// datasources/sources/website.js - Website crawler data source
const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');
const DataSourceInterface = require('../source-interface');
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');

/**
 * Website data source adapter
 */
class WebsiteDataSource extends DataSourceInterface {
  /**
   * Initialize the website data source
   * @param {Object} config Configuration for the website crawler
   */
  async initialize(config) {
    // Base website URL
    this.baseUrl = config.websiteUrl || config.folderPath;
    if (!this.baseUrl) {
      throw new ApiError('Website URL is required', 400);
    }
    
    // Ensure URL has protocol
    if (!this.baseUrl.startsWith('http')) {
      this.baseUrl = `https://${this.baseUrl}`;
    }
    
    // Parse the URL
    try {
      this.parsedUrl = new URL(this.baseUrl);
    } catch (error) {
      throw new ApiError(`Invalid URL: ${this.baseUrl}`, 400);
    }
    
    // Crawler settings
    this.crawlDepth = parseInt(config.crawlDepth || 3);
    this.maxPages = parseInt(config.maxPages || 100);
    this.includeSitemaps = config.includeSitemaps !== false;
    this.includeRobotsTxt = config.includeRobotsTxt !== false;
    this.followLinks = config.followLinks !== false;
    this.restrictToDomain = config.restrictToDomain !== false;
    this.urlPatterns = config.urlPatterns || [];
    this.excludePatterns = config.excludePatterns || [
      /\.(jpg|jpeg|png|gif|svg|webp|mp4|webm|ogg|mp3|wav|pdf|doc|docx|xls|xlsx|zip|tar|gz|rar)$/i,
      /(\?|&)(utm_|fbclid|ref)/i,
      /\/(tag|category)\//i
    ];
    
    // Request throttling
    this.requestDelay = parseInt(config.requestDelay || 1000); // Default 1s delay between requests
    this.maxConcurrent = parseInt(config.maxConcurrent || 5); // Maximum concurrent requests
    
    // HTTP client settings
    this.timeout = parseInt(config.timeout || 10000);
    this.userAgent = config.userAgent || 'AI Knowledge Assistant Crawler/1.0';
    this.retries = parseInt(config.retries || 3);
    
    // Create axios instance
    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent
      }
    });
    
    // Add retry logic
    this.client.interceptors.response.use(undefined, async (error) => {
      const config = error.config;
      
      // Only retry on network errors or 5xx status codes
      if ((!error.response || error.response.status >= 500) && 
          (!config._retryCount || config._retryCount < this.retries)) {
        
        // Increment retry count
        config._retryCount = config._retryCount || 0;
        config._retryCount++;
        
        // Delay before retrying (with exponential backoff)
        const delay = this.requestDelay * Math.pow(2, config._retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.client(config);
      }
      
      return Promise.reject(error);
    });
  }

  /**
   * Fetch documents from the website
   * @param {Object} query Query parameters
   * @returns {Promise<Array>} Array of documents
   */
  async fetchDocuments(query = {}) {
    logger.debug(`Crawling website: ${this.baseUrl}`);
    
    // Initialize variables
    const visited = new Set();
    const queue = [this.baseUrl];
    const documents = [];
    let currentDepth = 0;
    let activeRequests = 0;
    
    // Check robots.txt if enabled
    let disallowedPaths = [];
    if (this.includeRobotsTxt) {
      disallowedPaths = await this.parseRobotsTxt();
    }
    
    // Add sitemap URLs if enabled
    if (this.includeSitemaps) {
      const sitemapUrls = await this.parseSitemaps();
      sitemapUrls.forEach(url => {
        if (!visited.has(url)) {
          queue.push(url);
        }
      });
    }
    
    // Helper function to delay requests
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    // Process URLs with throttling and concurrency control
    while (queue.length > 0 && documents.length < this.maxPages) {
      // Wait if too many active requests
      while (activeRequests >= this.maxConcurrent) {
        await delay(100);
      }
      
      // Get next URL
      const currentUrl = queue.shift();
      
      // Skip if already visited
      if (visited.has(currentUrl)) {
        continue;
      }
      
      // Mark as visited
      visited.add(currentUrl);
      
      // Check if URL matches disallowed patterns
      if (this.isDisallowed(currentUrl, disallowedPaths)) {
        continue;
      }
      
      // Process URL
      activeRequests++;
      this.processUrl(currentUrl, currentDepth, visited, queue, documents)
        .finally(() => {
          activeRequests--;
        });
      
      // Add delay between requests to avoid overloading the server
      await delay(this.requestDelay);
      
      // If queue is empty at current depth and we haven't reached max depth, increment depth
      if (queue.length === 0 && currentDepth < this.crawlDepth) {
        currentDepth++;
        logger.debug(`Moving to crawl depth ${currentDepth}`);
      }
      
      // Wait for all active requests to complete before finishing
      if (queue.length === 0) {
        while (activeRequests > 0) {
          await delay(100);
        }
      }
    }
    
    logger.debug(`Crawled ${visited.size} pages, extracted ${documents.length} documents`);
    return documents;
  }
  
  /**
   * Process a URL
   * @param {string} currentUrl URL to process
   * @param {number} currentDepth Current crawl depth
   * @param {Set} visited Set of visited URLs
   * @param {Array} queue Queue of URLs to process
   * @param {Array} documents Array of documents
   * @returns {Promise<void>}
   * @private
   */
  async processUrl(currentUrl, currentDepth, visited, queue, documents) {
    try {
      // Fetch page
      const response = await this.client.get(currentUrl);
      const contentType = response.headers['content-type'] || '';
      
      // Only process HTML pages
      if (!contentType.includes('text/html')) {
        return;
      }
      
      // Parse HTML
      const $ = cheerio.load(response.data);
      
      // Extract text content
      const title = $('title').text().trim() || currentUrl;
      const bodyText = this.extractText($);
      
      // Skip if no meaningful content (less than 100 characters)
      if (bodyText.length < 100) {
        return;
      }
      
      // Create document
      documents.push({
        id: Buffer.from(currentUrl).toString('base64'),
        title: title,
        content: bodyText,
        metadata: {
          source: 'website',
          url: currentUrl,
          domain: this.parsedUrl.hostname,
          crawlDate: new Date().toISOString(),
          crawlDepth: currentDepth
        }
      });
      
      // Extract links if we should follow them and haven't reached max depth
      if (this.followLinks && currentDepth < this.crawlDepth) {
        const links = this.extractLinks($, currentUrl);
        
        // Add new links to queue
        links.forEach(link => {
          if (!visited.has(link)) {
            queue.push(link);
          }
        });
      }
    } catch (error) {
      logger.error(`Error crawling ${currentUrl}:`, error.message);
    }
  }

  /**
   * Extract readable text from HTML
   * @param {Object} $ Cheerio instance
   * @returns {string} Extracted text
   * @private
   */
  extractText($) {
    // Remove scripts, styles, and hidden elements
    $('script, style, [style*="display:none"], [style*="display: none"], [style*="visibility:hidden"], [class*="hidden"]').remove();
    
    // Extract title, headers, and meta description for better context
    let metadata = '';
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    
    if (title) {
      metadata += `Title: ${title}\n\n`;
    }
    
    if (description) {
      metadata += `Description: ${description}\n\n`;
    }
    
    // Extract headers to understand document structure
    const headers = [];
    $('h1, h2, h3').each((i, el) => {
      const text = $(el).text().trim();
      const tag = el.name;
      if (text) {
        headers.push(`${tag}: ${text}`);
      }
    });
    
    if (headers.length > 0) {
      metadata += `Headers:\n${headers.join('\n')}\n\n`;
    }
    
    // Get main content areas 
    let mainContent = '';
    
    // Try to find main content container
    const contentSelectors = [
      'main', 'article', '.content', '.main-content', 
      '#content', '#main-content', '.post-content',
      '[role="main"]'
    ];
    
    let contentFound = false;
    for (const selector of contentSelectors) {
      if ($(selector).length > 0) {
        mainContent = $(selector).text().trim();
        contentFound = true;
        break;
      }
    }
    
    // If no content container found, use body
    if (!contentFound) {
      mainContent = $('body').text().trim();
    }
    
    // Clean up text
    const cleanedText = mainContent
      .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
      .replace(/\n+/g, '\n')  // Replace multiple newlines with single newline
      .trim();
    
    return `${metadata}Content:\n${cleanedText}`;
  }

  /**
   * Extract links from HTML
   * @param {Object} $ Cheerio instance
   * @param {string} baseUrl Base URL for resolving relative links
   * @returns {Array<string>} Array of links
   * @private
   */
  extractLinks($, baseUrl) {
    const links = [];
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      
      // Skip empty or javascript links
      if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
        return;
      }
      
      // Resolve relative URL
      let resolvedUrl;
      try {
        resolvedUrl = new URL(href, baseUrl).href;
      } catch (error) {
        return; // Skip invalid URLs
      }
      
      // Normalize URL (remove trailing slashes, fragments, etc.)
      resolvedUrl = this.normalizeUrl(resolvedUrl);
      
      // Skip if different domain and we're restricting to domain
      try {
        const parsedUrl = new URL(resolvedUrl);
        if (this.restrictToDomain && parsedUrl.hostname !== this.parsedUrl.hostname) {
          return;
        }
      } catch (error) {
        return; // Skip invalid URLs
      }
      
      // Skip if matches exclude patterns
      if (this.excludePatterns.some(pattern => pattern.test(resolvedUrl))) {
        return;
      }
      
      // Skip if doesn't match include patterns (if provided)
      if (this.urlPatterns.length > 0 && 
          !this.urlPatterns.some(pattern => new RegExp(pattern).test(resolvedUrl))) {
        return;
      }
      
      // Add to links
      links.push(resolvedUrl);
    });
    
    return links;
  }

  /**
   * Normalize URL by removing fragments, etc.
   * @param {string} url URL to normalize
   * @returns {string} Normalized URL
   * @private
   */
  normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      
      // Remove fragment
      parsed.hash = '';
      
      // Remove common tracking parameters
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid'];
      paramsToRemove.forEach(param => {
        parsed.searchParams.delete(param);
      });
      
      return parsed.href;
    } catch (error) {
      return url;
    }
  }

  /**
   * Parse robots.txt file to get disallowed paths
   * @returns {Promise<Array<string>>} Array of disallowed paths
   * @private
   */
  async parseRobotsTxt() {
    try {
      const robotsUrl = `${this.parsedUrl.protocol}//${this.parsedUrl.hostname}/robots.txt`;
      const response = await this.client.get(robotsUrl);
      const robotsTxt = response.data;
      
      // Extract Disallow directives
      const disallowedPaths = [];
      const lines = robotsTxt.split('\n');
      
      let currentUserAgent = '*';
      let isRelevantUserAgent = true;
      
      for (const line of lines) {
        const trimmedLine = line.trim().toLowerCase();
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('#') || trimmedLine === '') {
          continue;
        }
        
        // Check for User-agent directive
        if (trimmedLine.startsWith('user-agent:')) {
          const agent = trimmedLine.substring('user-agent:'.length).trim();
          currentUserAgent = agent;
          isRelevantUserAgent = agent === '*' || 
                               this.userAgent.toLowerCase().includes(agent) || 
                               agent.includes('bot');
        }
        
        // If relevant user agent, extract Disallow directives
        if (isRelevantUserAgent && trimmedLine.startsWith('disallow:')) {
          const path = trimmedLine.substring('disallow:'.length).trim();
          if (path) {
            // Convert robots.txt pattern to regex
            let regex = path
              .replace(/\*/g, '.*')
              .replace(/\?/g, '\\?')
              .replace(/\./g, '\\.')
              .replace(/\//g, '\\/');
              
            // Add the disallowed path
            disallowedPaths.push({
              path: path,
              regex: new RegExp(`^${regex}`)
            });
          }
        }
      }
      
      return disallowedPaths;
    } catch (error) {
      logger.error('Error parsing robots.txt:', error.message);
      return [];
    }
  }

  /**
   * Parse sitemaps to get URLs
   * @returns {Promise<Array<string>>} Array of URLs from sitemaps
   * @private
   */
  async parseSitemaps() {
    try {
      // Try common sitemap locations
      const potentialSitemaps = [
        `${this.parsedUrl.protocol}//${this.parsedUrl.hostname}/sitemap.xml`,
        `${this.parsedUrl.protocol}//${this.parsedUrl.hostname}/sitemap_index.xml`,
        `${this.parsedUrl.protocol}//${this.parsedUrl.hostname}/sitemap-index.xml`,
        `${this.parsedUrl.protocol}//${this.parsedUrl.hostname}/sitemaps.xml`
      ];
      
      let sitemap = null;
      let sitemapUrl = null;
      
      // Try each potential sitemap URL
      for (const url of potentialSitemaps) {
        try {
          const response = await this.client.get(url, { timeout: 5000 });
          if (response.status === 200 && response.data) {
            sitemap = response.data;
            sitemapUrl = url;
            break;
          }
        } catch (error) {
          // Continue trying other URLs
        }
      }
      
      if (!sitemap) {
        logger.debug(`No sitemap found for ${this.parsedUrl.hostname}`);
        return [];
      }
      
      // Parse XML
      const $ = cheerio.load(sitemap, {
        xmlMode: true
      });
      
      // Extract URLs
      const urls = [];
      
      // Check for sitemap index
      const sitemapTags = $('sitemap loc');
      if (sitemapTags.length > 0) {
        // This is a sitemap index, extract URLs from each sitemap (up to 5 to avoid too many requests)
        const maxSitemapsToProcess = Math.min(5, sitemapTags.length);
        
        for (let i = 0; i < maxSitemapsToProcess; i++) {
          const subsitemapUrl = $(sitemapTags[i]).text();
          try {
            const subsitemapResponse = await this.client.get(subsitemapUrl, { timeout: 5000 });
            const subsitemapXml = subsitemapResponse.data;
            const $subsitemap = cheerio.load(subsitemapXml, {
              xmlMode: true
            });
            
            $subsitemap('url loc').each((i, el) => {
              const urlText = $subsitemap(el).text().trim();
              if (urlText) {
                urls.push(urlText);
              }
            });
            
            // Add delay between requests
            await new Promise(resolve => setTimeout(resolve, this.requestDelay));
          } catch (error) {
            logger.error(`Error parsing subsitemap ${subsitemapUrl}:`, error.message);
          }
        }
      } else {
        // Regular sitemap
        $('url loc').each((i, el) => {
          const urlText = $(el).text().trim();
          if (urlText) {
            urls.push(urlText);
          }
        });
      }
      
      logger.debug(`Found ${urls.length} URLs in sitemap`);
      return urls;
    } catch (error) {
      logger.error('Error parsing sitemap:', error.message);
      return [];
    }
  }

  /**
   * Check if URL is disallowed by robots.txt
   * @param {string} url URL to check
   * @param {Array<Object>} disallowedPaths Array of disallowed paths
   * @returns {boolean} Whether URL is disallowed
   * @private
   */
  isDisallowed(url, disallowedPaths) {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname + parsedUrl.search;
      
      return disallowedPaths.some(item => item.regex.test(path));
    } catch (error) {
      return false;
    }
  }

  /**
   * Get information about the website data source
   * @returns {Object} Data source information
   */
  getSourceInfo() {
    return {
      type: 'website',
      websiteUrl: this.baseUrl,
      crawlDepth: this.crawlDepth,
      maxPages: this.maxPages,
      restrictToDomain: this.restrictToDomain,
      followLinks: this.followLinks,
      requestDelay: this.requestDelay
    };
  }
  
  /**
   * Test connection to the website
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    try {
      const response = await this.client.get(this.baseUrl, { 
        timeout: 5000,
        validateStatus: status => status < 500 // Accept any status code below 500
      });
      
      // Consider 2xx status codes as success
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      logger.error(`Failed to connect to website ${this.baseUrl}:`, error.message);
      return false;
    }
  }
  
  /**
   * Get capabilities of website data source
   * @returns {Object} Capabilities
   */
  getCapabilities() {
    return {
      searchable: false,
      filterable: true,
      pageable: false,
      supportsRealTimeUpdates: false
    };
  }
}

module.exports = WebsiteDataSource;