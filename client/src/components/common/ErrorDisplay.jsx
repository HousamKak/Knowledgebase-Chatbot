// ErrorDisplay.js placeholder
import React from 'react';
import '../../styles/ErrorDisplay.css';

const ErrorDisplay = ({ message }) => {
  return (
    <div className="error-display">
      <div className="error-icon">⚠️</div>
      <div className="error-message">{message}</div>
    </div>
  );
};

export default ErrorDisplay;