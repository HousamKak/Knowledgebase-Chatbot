import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

/**
 * Text splitter factory for creating appropriate splitters
 */
export class TextSplitterFactory {
  /**
   * Create a text splitter based on configuration
   * @param {Object} config Text splitter configuration
   * @returns {TextSplitter} LangChain text splitter
   */
  static createSplitter(config = {}) {
    const {
      chunkSize = 1000,
      chunkOverlap = 200,
      separators = ["\n\n", "\n", " ", ""]
    } = config;
    
    return new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators
    });
  }
}