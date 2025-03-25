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
    
    // HTTP client settings
    this.timeout = parseInt(config.timeout || 10000);
    this.userAgent = config.userAgent || 'AI Knowledge Assistant Crawler/1.0';
    
    // Create axios instance
    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent
      }
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
    
    // Process the queue
    while (queue.length > 0 && documents.length < this.maxPages) {
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
      
      try {
        // Fetch page
        const response = await this.client.get(currentUrl);
        const contentType = response.headers['content-type'] || '';
        
        // Only process HTML pages
        if (!contentType.includes('text/html')) {
          continue;
        }
        
        // Parse HTML
        const $ = cheerio.load(response.data);
        
        // Extract text content
        const title = $('title').text().trim() || currentUrl;
        const bodyText = this.extractText($);
        
        // Create document
        documents.push({
          id: Buffer.from(currentUrl).toString('base64'),
          title: title,
          content: bodyText,
          metadata: {
            source: 'website',
            url: currentUrl,
            domain: this.parsedUrl.hostname,
            lastCrawled: new Date().toISOString()
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
      
      // If queue is empty at current depth, increment depth
      if (queue.length === 0 && currentDepth < this.crawlDepth) {
        currentDepth++;
      }
    }
    
    logger.debug(`Crawled ${visited.size} pages, extracted ${documents.length} documents`);
    return documents;
  }

  /**
   * Extract readable text from HTML
   * @param {Object} $ Cheerio instance
   * @returns {string} Extracted text
   * @private
   */
  extractText($) {
    // Remove scripts, styles, and hidden elements
    $('script, style, [style*="display:none"], [style*="display: none"]').remove();
    
    // Get text from body
    const text = $('body').text();
    
    // Clean up text
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
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
      const resolvedUrl = url.resolve(baseUrl, href);
      const parsedUrl = new URL(resolvedUrl);
      
      // Skip if different domain and we're restricting to domain
      if (this.restrictToDomain && parsedUrl.hostname !== this.parsedUrl.hostname) {
        return;
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
      
      let isRelevantUserAgent = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check for User-agent directive
        if (trimmedLine.startsWith('User-agent:')) {
          const agent = trimmedLine.substring('User-agent:'.length).trim();
          isRelevantUserAgent = agent === '*' || agent === this.userAgent;
        }
        
        // If relevant user agent, extract Disallow directives
        if (isRelevantUserAgent && trimmedLine.startsWith('Disallow:')) {
          const path = trimmedLine.substring('Disallow:'.length).trim();
          if (path) {
            disallowedPaths.push(path);
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
      // First, try sitemap.xml
      const sitemapUrl = `${this.parsedUrl.protocol}//${this.parsedUrl.hostname}/sitemap.xml`;
      const response = await this.client.get(sitemapUrl);
      const xml = response.data;
      
      // Parse XML
      const $ = cheerio.load(xml, {
        xmlMode: true
      });
      
      // Extract URLs
      const urls = [];
      
      // Check for sitemap index
      const sitemapTags = $('sitemap loc');
      if (sitemapTags.length > 0) {
        // This is a sitemap index, extract URLs from each sitemap
        for (let i = 0; i < sitemapTags.length; i++) {
          const subsitemapUrl = $(sitemapTags[i]).text();
          try {
            const subsitemapResponse = await this.client.get(subsitemapUrl);
            const subsitemapXml = subsitemapResponse.data;
            const $subsitemap = cheerio.load(subsitemapXml, {
              xmlMode: true
            });
            
            $subsitemap('url loc').each((i, el) => {
              urls.push($subsitemap(el).text());
            });
          } catch (error) {
            logger.error(`Error parsing subsitemap ${subsitemapUrl}:`, error.message);
          }
        }
      } else {
        // Regular sitemap
        $('url loc').each((i, el) => {
          urls.push($(el).text());
        });
      }
      
      return urls;
    } catch (error) {
      logger.error('Error parsing sitemap:', error.message);
      return [];
    }
  }

  /**
   * Check if URL is disallowed by robots.txt
   * @param {string} url URL to check
   * @param {Array<string>} disallowedPaths Array of disallowed paths
   * @returns {boolean} Whether URL is disallowed
   * @private
   */
  isDisallowed(url, disallowedPaths) {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    
    return disallowedPaths.some(disallowedPath => {
      if (disallowedPath.endsWith('*')) {
        // Wildcard match
        const prefix = disallowedPath.slice(0, -1);
        return path.startsWith(prefix);
      } else {
        // Exact match
        return path === disallowedPath;
      }
    });
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
      restrictToDomain: this.restrictToDomain
    };
  }
  
  /**
   * Test connection to the website
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    try {
      await this.client.get(this.baseUrl);
      return true;
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