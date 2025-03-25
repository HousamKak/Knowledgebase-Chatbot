// Message.js placeholder
import React from 'react';
import ReactMarkdown from 'react-markdown';

const Message = ({ message, onToggleSources }) => {
  const { sender, text, timestamp, hasSources } = message;
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`message ${sender}`}>
      <div className="message-header">
        <span className="sender">
          {sender === 'user' ? 'You' : 'AI Assistant'}
        </span>
        <span className="timestamp">{formattedTime}</span>
      </div>
      
      <div className="message-content">
        {sender === 'assistant' ? (
          <ReactMarkdown className="markdown-content">
            {text}
          </ReactMarkdown>
        ) : (
          <p>{text}</p>
        )}
      </div>
      
      {sender === 'assistant' && hasSources && (
        <button 
          className="source-button"
          onClick={onToggleSources}
        >
          View Sources
        </button>
      )}
    </div>
  );
};

export default Message;