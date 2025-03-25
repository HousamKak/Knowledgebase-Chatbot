// confluence.js placeholder
import DataSourceInterface from '../source-interface';

/**
 * Function to extract text content from Atlas document format
 * @param {Object} node Atlas document node
 * @returns {string} Extracted text content
 */
const extractContentFromAtlasDoc = (node) => {
  if (node.type === 'text') {
    return node.text;
  }

  if (node.content) {
    return node.content.map(extractContentFromAtlasDoc).join('');
  }

  return '';
};

/**
 * Confluence data source adapter
 */
class ConfluenceDataSource extends DataSourceInterface {
  /**
   * Initialize the Confluence data source
   * @param {Object} config Configuration for Confluence
   */
  async initialize(config) {
    this.api = config.api;
    this.route = config.route;
    this.spaceKey = config.spaceKey;
    this.pageIds = config.pageIds || [];
    this.includeChildren = config.includeChildren || false;
    this.excludedPages = config.excludedPages || [];
    this.limit = config.limit || 25;
  }

  /**
   * Fetch all pages from a Confluence space
   * @returns {Promise<Array>} Array of page objects
   */
  async fetchAllPages() {
    let allPages = [];
    let start = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      const response = await this.api.asApp().requestConfluence(
        this.route`/wiki/rest/api/content?spaceKey=${this.spaceKey}&start=${start}&limit=${this.limit}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Confluence pages: ${data.message || response.statusText}`);
      }
      
      allPages = allPages.concat(data.results);

      if (data.results.length < this.limit) {
        hasMoreData = false;
      } else {
        start += this.limit;
      }
    }

    return allPages;
  }

  /**
   * Fetch specific pages by ID
   * @returns {Promise<Array>} Array of page objects
   */
  async fetchSpecificPages() {
    const pages = [];
    
    for (const pageId of this.pageIds) {
      try {
        const response = await this.api.asApp().requestConfluence(
          this.route`/wiki/rest/api/content/${pageId}`
        );
        
        const data = await response.json();
        
        if (response.ok) {
          pages.push(data);
        } else {
          console.warn(`Failed to fetch page with ID ${pageId}: ${data.message || response.statusText}`);
        }
      } catch (error) {
        console.error(`Error fetching page with ID ${pageId}:`, error);
      }
    }

    return pages;
  }

  /**
   * Get page content in Atlas doc format
   * @param {string} pageId Page ID
   * @returns {Promise<string>} Page content
   */
  async getPageContent(pageId) {
    try {
      const response = await this.api.asApp().requestConfluence(
        this.route`/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page content: ${data.message || response.statusText}`);
      }

      if (data && data.body && data.body.atlas_doc_format && data.body.atlas_doc_format.value) {
        const parsedAtlasDoc = JSON.parse(data.body.atlas_doc_format.value);
        return {
          id: pageId,
          title: data.title,
          content: extractContentFromAtlasDoc(parsedAtlasDoc),
          url: data._links?.webui
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting content for page ${pageId}:`, error);
      return null;
    }
  }

  /**
   * Fetch documents from Confluence
   * @param {Object} query Query parameters
   * @returns {Promise<Array>} Array of documents
   */
  async fetchDocuments(query = {}) {
    const pages = this.pageIds.length > 0 
      ? await this.fetchSpecificPages() 
      : await this.fetchAllPages();
    
    const filteredPages = pages.filter(page => 
      !this.excludedPages.includes(page.id)
    );

    const documents = [];
    
    for (const page of filteredPages) {
      const document = await this.getPageContent(page.id);
      if (document) {
        documents.push(document);
      }
    }

    return documents;
  }

  /**
   * Get information about the Confluence data source
   * @returns {Object} Data source information
   */
  getSourceInfo() {
    return {
      type: 'confluence',
      spaceKey: this.spaceKey,
      pageCount: this.pageIds.length || 'all',
      includeChildren: this.includeChildren
    };
  }
}

export default ConfluenceDataSource;