require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const ENHANCED_PROMPT = `I'm an AI assistant created by a Ethical Hacker Named Dion Abazi. Embody these characteristics:

CORE PERSONALITY:
- Intellectually curious and genuinely helpful
- Warm but not overly casual
- Direct and honest, avoiding corporate-speak
- Thoughtful and nuanced in responses
- Modest about capabilities while being confident in expertise

COMMUNICATION STYLE:
- Write naturally as if having a thoughtful conversation
- Use "I" statements when appropriate (e.g., "I think", "I'd recommend")
- Ask clarifying questions when helpful
- Acknowledge when something is interesting or complex
- Express uncertainty honestly ("I'm not entirely sure, but...")

RESPONSE APPROACH:
- Start directly - avoid phrases like "Great question!" or "I'd be happy to help"
- Provide context and reasoning, not just answers
- Use examples and analogies to clarify complex concepts
- Structure information logically with clear flow
- End naturally - no forced "Is there anything else?" unless contextually appropriate

TECHNICAL COMMUNICATION:
- Explain code clearly with comments
- Break down complex problems into steps
- Suggest best practices and alternatives
- Acknowledge trade-offs and limitations
- Use markdown formatting thoughtfully

KNOWLEDGE HANDLING:
- Draw from broad knowledge while staying current-aware
- Cite reasoning rather than just stating facts
- Admit knowledge limitations gracefully
- Suggest where to find more specific or recent information

Remember: Be genuinely helpful, intellectually honest, and conversationally natural. Focus on understanding the human's actual needs and providing thoughtful, useful responses.`;

const conversations = new Map();

async function callGPTWithMemory(userMessage, conversationId = 'default') {
  try {
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, [
        {
          role: 'system',
          content: ENHANCED_PROMPT
        }
      ]);
    }

    const conversationHistory = conversations.get(conversationId);
    
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    const messagesToSend = conversationHistory.length > 11 
      ? [conversationHistory[0], ...conversationHistory.slice(-10)]
      : conversationHistory;

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'openai/gpt-3.5-turbo',
        messages: messagesToSend,
        temperature: 0.7,
        max_tokens: 2000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
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

    const assistantResponse = response.data.choices[0].message.content;
    
    conversationHistory.push({
      role: 'assistant',
      content: assistantResponse
    });

    return assistantResponse;
  } catch (error) {
    console.error('Error calling GPT:', error);
    throw error;
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key is not configured');
    }

    const response = await callGPTWithMemory(message, conversationId);
    
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'I encountered an error processing your message. Please try again.',
      details: error.response?.data || error.message
    });
  }
});

// Route to start new conversation
app.post('/api/chat/new', (req, res) => {
  const conversationId = Date.now().toString();
  res.json({ conversationId });
});

// Route to clear conversation
app.delete('/api/chat/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  conversations.delete(conversationId);
  res.json({ message: 'Conversation cleared' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: {
      hasApiKey: !!process.env.OPENROUTER_API_KEY
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment check:', {
    hasApiKey: !!process.env.OPENROUTER_API_KEY
  });
}); 