// knowledge/langchain/text-splitters.js - Text splitter factory
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MarkdownTextSplitter } = require("langchain/text_splitter");
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');

/**
 * Text splitter factory for creating appropriate splitters
 */
class TextSplitterFactory {
  /**
   * Create a text splitter based on configuration
   * @param {Object} config Text splitter configuration
   * @returns {TextSplitter} LangChain text splitter
   */
  static createSplitter(config = {}) {
    const splitterType = config.type || 'recursive';
    
    logger.debug(`Creating text splitter: ${splitterType}`);
    
    switch (splitterType) {
      case 'recursive':
        return new RecursiveCharacterTextSplitter({
          chunkSize: config.chunkSize || 1000,
          chunkOverlap: config.chunkOverlap || 200,
          separators: config.separators || ["\n\n", "\n", ". ", " ", ""]
        });
      
      case 'markdown':
        return new MarkdownTextSplitter({
          chunkSize: config.chunkSize || 1000,
          chunkOverlap: config.chunkOverlap || 200
        });
      
      default:
        throw new ApiError(`Unsupported text splitter type: ${splitterType}`, 400);
    }
  }
  
  /**
   * Get available text splitter types
   * @returns {Array<Object>} Array of available text splitter types
   */
  static getAvailableSplitterTypes() {
    return [
      {
        id: 'recursive',
        name: 'Recursive Character Splitter',
        description: 'General-purpose text splitter with customizable separators',
        recommendedFor: ['General text', 'Code', 'Plain text documents']
      },
      {
        id: 'markdown',
        name: 'Markdown Splitter',
        description: 'Specialized splitter that respects Markdown structure',
        recommendedFor: ['Markdown documents', 'README files', 'Documentation']
      }
    ];
  }
}

module.exports = {
  TextSplitterFactory
};