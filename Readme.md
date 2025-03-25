# Confluence AI Assistant with LangChain RAG

A powerful, extensible AI assistant for Confluence that uses Retrieval-Augmented Generation (RAG) to deliver accurate answers based on your organization's knowledge. This enhanced version integrates LangChain for advanced RAG capabilities, supporting multiple LLM providers and data sources, making it highly adaptable to different needs and environments.

![Confluence AI Assistant](https://via.placeholder.com/800x400?text=Confluence+AI+Assistant+with+RAG)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
  - [RAG Architecture](#rag-architecture)
  - [LangChain Integration](#langchain-integration)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Initial Setup](#initial-setup)
  - [AI Model Configuration](#ai-model-configuration)
  - [Data Source Configuration](#data-source-configuration)
  - [RAG Configuration](#rag-configuration)
- [Usage](#usage)
  - [Asking Questions](#asking-questions)
  - [Viewing Sources](#viewing-sources)
  - [Managing the Knowledge Base](#managing-the-knowledge-base)
  - [Managing Configuration](#managing-configuration)
- [Extending the Assistant](#extending-the-assistant)
  - [Adding New AI Models](#adding-new-ai-models)
  - [Adding New Data Sources](#adding-new-data-sources)
  - [Customizing RAG Components](#customizing-rag-components)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Development Workflow](#development-workflow)
  - [Environment Variables](#environment-variables)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Support](#support)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

- **Advanced RAG Implementation**: Uses LangChain for sophisticated document retrieval and generation
- **Multiple AI Model Support**: Seamlessly switch between different LLM providers like OpenAI (GPT) and Anthropic (Claude)
- **Configurable Data Sources**: Connect to Confluence spaces and external data sources like Halo ISTM
- **Vector Embeddings**: Supports OpenAI embeddings and other embedding models (with TF-IDF as a fallback option)
- **Smart Document Chunking**: Intelligent document splitting that respects semantic boundaries
- **Source Citations**: Answers include references to source documents with links
- **Web UI**: Modern React-based user interface for asking questions and managing configuration
- **Secure API Key Management**: Safely store and manage API keys for various services
- **Modular Architecture**: Easily extensible with new models, data sources, and embedding strategies
- **Configurable RAG Pipeline**: Adjust chunking, retrieval, and generation parameters through the UI
- **Dark/Light Mode**: Attractive UI with theme options

## Architecture

The project follows a client-server architecture with a clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├───────────┬───────────────┬────────────────┬───────────────┐│
│ Chat UI   │ Model Selector│ Data Source    │ RAG           ││
│           │               │ Manager        │ Configuration  ││
└───────────┴───────────────┴────────────────┴───────────────┘│
                               │
┌─────────────────────────────┼─────────────────────────────┐
│                        Forge Bridge                        │
└─────────────────────────────┼─────────────────────────────┘
                               │
┌─────────────────────────────┼─────────────────────────────┐
│                    Backend (Forge API)                     │
├───────────┬───────────────┬────────────────┬──────────────┤
│ Model     │ Data Source   │ LangChain RAG  │ Config       │
│ Adapters  │ Adapters      │ Components     │ Manager      │
├───────────┼───────────────┼────────────────┼──────────────┤
│ OpenAI    │ Confluence    │ Embeddings     │ API Key      │
│ Claude    │ Halo ISTM     │ Vector Stores  │ Manager      │
│ etc...    │ etc...        │ Chains         │              │
└───────────┴───────────────┴────────────────┴──────────────┘
```

### Server Side (Backend)

- **Model Adapters**: Provides a unified interface for different LLM providers
- **Data Source Adapters**: Standardizes access to different knowledge sources
- **Knowledge Management**: Handles document indexing and retrieval using vector embeddings
- **API Layer**: Resolvers that expose functionality to the client

### Client Side (Frontend)

- **React Components**: Modern UI built with React
- **Service Layer**: Client-side services that communicate with the backend
- **Context Providers**: State management for models, data sources, and configuration
- **Setup Wizard**: Guides users through initial configuration

### Technology Stack

- **Backend**: Atlassian Forge
- **Frontend**: React
- **APIs**: OpenAI, Anthropic, Confluence API
- **Storage**: Forge Storage API
- **Framework**: LangChain for RAG implementation

### RAG Architecture

The Retrieval-Augmented Generation (RAG) implementation uses the following pipeline:

1. **Document Ingestion**: Documents from configured data sources are processed
2. **Document Chunking**: Large documents are split into manageable chunks
3. **Embedding Generation**: Text chunks are converted to vector embeddings
4. **Vector Storage**: Embeddings are stored in a vector database
5. **Retrieval**: When a question is asked, relevant chunks are retrieved
6. **Context Assembly**: Retrieved chunks are assembled into a prompt context
7. **Generation**: The LLM generates an answer based on the retrieved context

### LangChain Integration

LangChain provides key components in the RAG pipeline:

- **Document Loaders**: Adapt data sources to LangChain format
- **Text Splitters**: Intelligent document chunking (RecursiveCharacterTextSplitter)
- **Embeddings**: Vector embedding generation (OpenAIEmbeddings, etc.)
- **Vector Stores**: Storage and retrieval of embeddings
- **Retrievers**: Semantic search for relevant documents
- **Chains**: Assembly of the RAG pipeline with LLMs

## Installation

### Prerequisites

- [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/)
- Node.js 16 or higher
- npm or yarn
- An Atlassian Developer account with Forge enabled
- API keys for your preferred LLM providers (OpenAI, Anthropic, etc.)

### Installation Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/confluence-ai-assistant.git
   cd confluence-ai-assistant
   ```

2. Install dependencies:

   ```bash
   npm install
   cd client
   npm install
   cd ../server
   npm install
   cd ..
   ```

3. Build the client:

   ```bash
   npm run build:client
   ```

4. Register the Forge app:

   ```bash
   forge register
   ```

5. Deploy the app to Forge:

   ```bash
   forge deploy
   ```

6. Install the app in your Confluence instance:
   ```bash
   forge install
   ```

## Configuration

### Initial Setup

When you first use the assistant, you'll be guided through a setup wizard that will help you:

1. **Configure an AI Model**: Add an API key for your preferred LLM provider
2. **Configure a Data Source**: Connect to a Confluence space or other data source

### AI Model Configuration

The assistant supports the following models out of the box:

- **OpenAI GPT**: Requires an OpenAI API key
- **Anthropic Claude**: Requires an Anthropic API key

To configure:

1. Go to the Configuration panel
2. Select the "AI Models" tab
3. Click "Add API Key" next to the model you want to use
4. Enter your API key and save
5. Select your default model

### Data Source Configuration

Configure data sources for knowledge retrieval:

1. Go to the Configuration panel
2. Select the "Data Sources" tab
3. Click "Add Data Source"
4. Configure data source settings:
   - **For Confluence**: Enter Space Key or select specific pages
   - **For Halo ISTM**: Configure API connection details

After adding a data source, it will automatically be indexed. You can re-index a data source at any time by clicking the "Re-index" button.

### RAG Configuration

Fine-tune the RAG system for optimal performance:

1. Go to the Configuration panel
2. Select the "RAG Configuration" tab
3. Adjust the following settings:
   - **Embedding Provider**: Choose the embedding model (e.g., OpenAI)
   - **Chunking Strategy**: Configure document splitting parameters
   - **Retrieval Settings**: Set number of chunks to retrieve, relevance thresholds
   - **Vector Store**: Configure in-memory or external vector database

## Usage

### Asking Questions

1. Type your question in the chat input
2. Press Enter or click the "Send" button
3. The RAG system will:
   - Retrieve relevant information from your knowledge base
   - Generate an answer based on the retrieved information
   - Provide source references for verification

### Viewing Sources

When an answer cites source documents:

1. Click "View Sources" below the response
2. A panel shows the source documents used
3. Click on a source to view the original document in Confluence

### Managing the Knowledge Base

To update your knowledge base:

1. Go to the Data Sources tab
2. Click "Re-index" on a data source to refresh its content
3. The RAG system will process and index any new or changed content

### Managing Configuration

Click the gear icon (⚙️) in the header to open the Configuration panel, where you can:

- Add or remove AI models
- Change the active AI model
- Add, edit, or remove data sources
- Re-index data sources
- Adjust appearance settings
- Configure RAG parameters

## Extending the Assistant

### Adding New AI Models

To add support for a new LLM provider:

1. Create a new adapter in `server/models/providers/` that extends `ModelInterface`
2. Implement the required methods: `initialize()`, `query()`, and `getCapabilities()`
3. Add the model to the `ModelFactory` in `server/models/model-factory.js`
4. Update the model settings in `ConfigManager.getDefaultConfig()` in `server/config/config-manager.js`
5. Update the LangChain integration (if using for RAG)

Example of a new model adapter:

```javascript
import ModelInterface from "../model-interface";

class NewModelAdapter extends ModelInterface {
  async initialize(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || "default-model";
    // Other initialization
  }

  async query(prompt, options = {}) {
    // Implement API call to the new model provider
    // Return formatted response
  }

  getCapabilities() {
    return {
      maxTokens: 8192,
      supportsStreaming: true,
      supportsFunctions: false,
    };
  }
}

export default NewModelAdapter;
```

### Adding New Data Sources

To add support for a new data source:

1. Create a new adapter in `server/datasources/sources/` that extends `DataSourceInterface`
2. Implement the required methods: `initialize()`, `fetchDocuments()`, and `getSourceInfo()`
3. Add the data source to the `DataSourceFactory` in `server/datasources/source-factory.js`
4. Create a LangChain document loader adapter

Example of a new data source adapter:

```javascript
import DataSourceInterface from "../source-interface";

class NewDataSource extends DataSourceInterface {
  async initialize(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    // Other initialization
  }

  async fetchDocuments(query = {}) {
    // Implement fetching documents from the new data source
    // Return formatted documents
  }

  getSourceInfo() {
    return {
      type: "new-source",
      // Other source information
    };
  }
}

export default NewDataSource;
```

### Customizing RAG Components

The LangChain integration allows customization of various RAG components:

1. **Embedding Models**: Add new embedding models in `server/knowledge/langchain/embeddings.js`
2. **Text Splitters**: Customize chunking in `server/knowledge/langchain/text-splitters.js`
3. **Vector Stores**: Add external vector databases in `server/knowledge/langchain/vector-stores.js`
4. **Retrievers**: Implement custom retrievers in `server/knowledge/langchain/retrievers.js`
5. **Chains**: Customize the RAG chain in `server/knowledge/langchain/chains.js`

## Development

### Project Structure

```
confluence-ai-assistant/
├── .gitignore
├── manifest.yml                  # Atlassian Forge manifest
├── package.json                  # Root package.json
├── server/                       # Backend code
│   ├── index.js                  # Main entry point
│   ├── package.json              # Server-specific dependencies
│   ├── models/                   # Model provider adapters
│   ├── datasources/              # Data source adapters
│   ├── knowledge/                # Knowledge management
│   │   ├── langchain/            # LangChain integration
│   │   │   ├── document-loaders.js
│   │   │   ├── text-splitters.js
│   │   │   ├── embeddings.js
│   │   │   ├── vector-stores.js
│   │   │   └── chains.js
│   │   └── knowledge-manager.js
│   ├── config/                   # Configuration management
│   └── resolvers/                # Forge API resolvers
└── client/                       # Frontend code
    ├── public/                   # Public assets
    ├── package.json              # Client-specific dependencies
    └── src/                      # Client source code
        ├── components/
        │   ├── chat/             # Chat interface
        │   ├── config/           # Configuration panels
        │   │   └── RagConfig.js  # RAG configuration UI
        │   └── ...
        ├── services/             # API services
        ├── contexts/             # React contexts
        ├── styles/               # CSS styles
        ├── App.js                # Main App component
        └── index.js              # Entry point for React app
```

### Development Workflow

1. **Backend Development**:

   ```bash
   cd server
   # Make changes
   cd ..
   forge deploy
   ```

2. **Frontend Development**:

   ```bash
   cd client
   npm start
   # Make changes (hot reload available)
   # When ready:
   npm run build
   cd ..
   forge deploy
   ```

3. **LangChain Integration Development**:

   ```bash
   cd server
   # Modify LangChain components in server/knowledge/langchain/
   cd ..
   forge deploy
   ```

4. **Debug Logs**:

   ```bash
   forge logs
   ```

5. **Running Tests**:

   ```bash
   # Run server tests
   cd server
   npm test

   # Run client tests
   cd client
   npm test
   ```

### Environment Variables

Create a `.env` file in the server directory with your development configuration:

```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Note: These are only for local development. In production, API keys are stored securely using Forge's storage API.

## Performance Optimization

### Optimizing RAG Performance

1. **Chunking Strategy**: Tune chunk size and overlap for your content

   - Smaller chunks (500-1000 chars) for precise retrieval
   - Larger chunks (1000-2000 chars) for more context

2. **Embedding Model Selection**:

   - OpenAI's text-embedding-ada-002 offers good performance/cost balance
   - Consider dimension reduction for large knowledge bases

3. **Vector Store Considerations**:

   - In-memory store works well for smaller knowledge bases
   - External vector DB recommended for large knowledge bases

4. **Retrieval Parameters**:

   - Start with retrieving 5-7 chunks
   - Increase if answers lack detail, decrease if irrelevant info appears

5. **Memory Management**:
   - Monitor Forge function memory usage
   - Implement pagination for large document processing
   - Consider limiting the scope of your data sources

## Troubleshooting

### Common Issues

#### RAG Not Finding Relevant Information

- Check if your data sources are properly indexed
- Verify the chunking strategy matches your content type
- Consider reindexing with different parameters
- Inspect retrieved chunks in debug logs
- Make sure your question is clear and related to the indexed content

#### Integration Issues with LangChain

- Check LangChain version compatibility
- Verify API keys have proper permissions
- Look for Forge deployment errors in logs
- Ensure vector store initialization is successful

#### API Key Authentication Errors

- Verify API keys are correctly stored
- Check if you have sufficient credits/quota with the AI provider
- Make sure the API key has the necessary permissions

#### Deployment Issues

- Check the Forge CLI logs for detailed error information:
  ```bash
  forge logs
  ```
- Make sure all dependencies are installed
- Verify your `manifest.yml` file is correctly formatted

#### Performance Issues

- Monitor memory usage in Forge logs
- Check for rate limiting with embedding APIs
- Consider optimizing chunk size and retrieval parameters
- For large knowledge bases, use an external vector database
- Increase the chat history limit in the configuration if necessary

### Support

For support:

- GitHub Issues: [Create an issue](https://github.com/yourusername/confluence-ai-assistant/issues)
- Documentation: [Project Wiki](https://github.com/yourusername/confluence-ai-assistant/wiki)
- Community: [Discussion Forum](https://community.atlassian.com/)
- Contact: support@example.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [LangChain](https://js.langchain.com/) for the powerful RAG implementation tools
- [Atlassian Forge](https://developer.atlassian.com/platform/forge/) for the hosting platform
- [OpenAI](https://openai.com/) and [Anthropic](https://www.anthropic.com/) for LLM technology
