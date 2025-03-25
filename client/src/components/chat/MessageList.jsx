// MessageList.js placeholder
import React from 'react';
import Message from './Message';

const MessageList = ({ messages, onToggleSources }) => {
  // If no messages, show welcome message
  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="welcome-message">
          <h2>Welcome to Confluence AI Assistant</h2>
          <p>
            Ask me a question about your Confluence content, and I'll provide
            answers based on the data sources you've configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <Message 
          key={message.id} 
          message={message} 
          onToggleSources={onToggleSources}
        />
      ))}
    </div>
  );
};

export default MessageList;