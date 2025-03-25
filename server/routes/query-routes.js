// routes/query-routes.js - Query-related routes
const express = require('express');
const queryService = require('../services/query-service');
const { catchAsync } = require('../middleware/error-handler');

const router = express.Router();

// Ask a question
router.post('/ask', catchAsync(async (req, res) => {
  const { question, modelType } = req.body;
  
  if (!question) {
    return res.status(400).json({ success: false, error: 'Question is required' });
  }
  
  const result = await queryService.answerQuestion(question, modelType);
  
  res.json({
    success: true,
    answer: result.answer,
    sources: result.sources
  });
}));

// Get knowledge base statistics
router.get('/stats', catchAsync(async (req, res) => {
  const stats = await queryService.getKnowledgeStats();
  
  res.json({
    success: true,
    stats
  });
}));

// Get chat history
router.get('/history', catchAsync(async (req, res) => {
  const { limit } = req.query;
  
  const history = await queryService.getChatHistory(parseInt(limit) || 50);
  
  res.json({
    success: true,
    history
  });
}));

// Clear chat history
router.delete('/history', catchAsync(async (req, res) => {
  await queryService.clearChatHistory();
  
  res.json({
    success: true
  });
}));

// Stream response (for real-time responses)
router.post('/stream', catchAsync(async (req, res) => {
  const { question, modelType } = req.body;
  
  if (!question) {
    return res.status(400).json({ success: false, error: 'Question is required' });
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  await queryService.streamAnswer(question, modelType, (chunk) => {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  });
  
  res.end();
}));

module.exports = router;