require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// OpenRouter API endpoint
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key is not configured');
    }

    console.log('Sending request to OpenRouter with message:', message);

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'ThreatIntel AI',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('OpenRouter response:', response.data);

    if (!response.data.choices || !response.data.choices[0]) {
      throw new Error('Invalid response format from OpenRouter');
    }

    res.json({
      response: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });

    res.status(500).json({
      error: 'Failed to get response from AI',
      details: error.response?.data || error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: {
    hasApiKey: !!process.env.OPENROUTER_API_KEY,
    appUrl: process.env.APP_URL
  }});
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment check:', {
    hasApiKey: !!process.env.OPENROUTER_API_KEY,
    appUrl: process.env.APP_URL
  });
}); 