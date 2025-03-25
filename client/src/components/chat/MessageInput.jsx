// MessageInput.js placeholder
import React, { useState } from 'react';

const MessageInput = ({ onSendMessage, disabled, selectedModel }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit} className="message-form">
        <textarea
          className="message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a question..."
          disabled={disabled}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!message.trim() || disabled}
        >
          {disabled ? 'Processing...' : 'Send'}
        </button>
      </form>
      
      <div className="input-footer">
        <span className="model-indicator">
          Using: {selectedModel?.name || 'Default AI'}
        </span>
      </div>
    </div>
  );
};

export default MessageInput;