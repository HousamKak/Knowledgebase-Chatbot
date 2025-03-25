// ChatInterface.js placeholder
import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import SourceDisplay from './SourceDisplay';
import { useModelContext } from '../../contexts/ModelContext';
import apiService from '../../services/api';
import '../../styles/ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  const [showSources, setShowSources] = useState(false);
  
  const { selectedModel } = useModelContext();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);
    setError(null);
    setSources([]);
    
    try {
      const response = await apiService.askQuestion(text, selectedModel?.id);
      
      if (response.success) {
        // Add assistant message
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: response.answer,
          timestamp: new Date().toISOString(),
          hasSources: response.sources?.length > 0
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
        
        // Set sources if available
        if (response.sources?.length > 0) {
          setSources(response.sources);
        }
      } else {
        setError(response.error || 'Failed to get a response');
      }
    } catch (error) {
      setError('Error sending message: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSources = () => {
    setShowSources(!showSources);
  };

  return (
    <div className="chat-interface">
      <div className="chat-container">
        <MessageList 
          messages={messages} 
          onToggleSources={toggleSources}
        />
        
        {error && <ErrorDisplay message={error} />}
        
        {isLoading && (
          <div className="loading-message">
            <LoadingSpinner />
            <span>AI is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput 
        onSendMessage={handleSendMessage} 
        disabled={isLoading}
        selectedModel={selectedModel}
      />
      
      {showSources && sources.length > 0 && (
        <SourceDisplay 
          sources={sources} 
          onClose={() => setShowSources(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;