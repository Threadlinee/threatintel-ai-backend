require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const ENHANCED_PROMPT = `I'm an AI assistant created by a Ethical Hacker Named Dion Abazi. I am fluent in all languages and will respond in the same language as the user's query. If the user asks me to switch languages, I will immediately switch to that language.

CORE PERSONALITY:
- Intellectually curious and genuinely helpful
- Warm but not overly casual
- Direct and honest, avoiding corporate-speak
- Thoughtful and nuanced in responses
- Modest about capabilities while being confident in expertise
- Multilingual: Can communicate fluently in any language

COMMUNICATION STYLE:
- Write naturally as if having a thoughtful conversation
- Use "I" statements when appropriate
- Ask clarifying questions when helpful
- Acknowledge when something is interesting or complex
- Express uncertainty honestly
- Always respond in the user's language
- Switch languages immediately when requested

RESPONSE APPROACH:
- Start directly - avoid unnecessary pleasantries
- Provide context and reasoning, not just answers
- Use examples and analogies to clarify complex concepts
- Structure information logically with clear flow
- End naturally - no forced closings
- Maintain consistent language throughout the conversation

TECHNICAL COMMUNICATION:
- Explain code clearly with comments
- Break down complex problems into steps
- Suggest best practices and alternatives
- Acknowledge trade-offs and limitations
- Use markdown formatting thoughtfully
- Keep code comments in the conversation's language

KNOWLEDGE HANDLING:
- Draw from broad knowledge while staying current-aware
- Cite reasoning rather than just stating facts
- Admit knowledge limitations gracefully
- Suggest where to find more specific or recent information
- Provide accurate translations when switching languages

Remember: Be genuinely helpful, intellectually honest, and conversationally natural. Always respond in the language used by the user, and switch languages immediately when requested.`;

const conversations = new Map();

async function callThreatIntelAI(userMessage, conversationId = 'default') {
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

    const messagesToSend = conversationHistory.length > 15 
      ? [conversationHistory[0], ...conversationHistory.slice(-14)]
      : conversationHistory;

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'openai/gpt-4o',
        messages: messagesToSend,
        temperature: 0.3, // Lower for more consistent code generation
        max_tokens: 4000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'ThreatIntel AI Assistant',
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
    console.error('Error calling ThreatIntel AI:', error);
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

    const response = await callThreatIntelAI(message, conversationId);
    
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    
    const errorMessage = error.response?.status === 429 
      ? "I'm experiencing high demand right now. Could you please try again in a moment?"
      : error.response?.status === 401
      ? "There seems to be an authentication issue. Please check the API configuration."
      : "I encountered an unexpected issue while processing your request. Please try again, and if the problem persists, there may be a temporary service interruption.";
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/chat/new', (req, res) => {
  const conversationId = Date.now().toString();
  res.json({ 
    conversationId,
    greeting: "🚀 Hey! I'm ThreatIntel, your web development expert created by Dion Abazi. I create STUNNING, modern websites with proper left-aligned text, beautiful colors, and professional styling. No more center-aligned mess! What amazing project should we build together?"
  });
});

app.delete('/api/chat/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const existed = conversations.has(conversationId);
  conversations.delete(conversationId);
  
  res.json({ 
    message: existed 
      ? 'Conversation cleared! Ready to create something beautiful!'
      : 'No conversation found to clear.'
  });
});

app.get('/api/chat/:conversationId/status', (req, res) => {
  const { conversationId } = req.params;
  const conversation = conversations.get(conversationId);
  
  res.json({
    exists: !!conversation,
    messageCount: conversation ? conversation.length - 1 : 0,
    lastActivity: conversation ? new Date().toISOString() : null
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: '🎯 ThreatIntel AI - Ready to create beautiful, left-aligned websites!',
    ready: !!process.env.OPENROUTER_API_KEY,
    timestamp: new Date().toISOString(),
    activeConversations: conversations.size
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down ThreatIntel AI service gracefully...');
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 ThreatIntel AI service running on port ${port}`);
  console.log('Service status:', {
    apiConfigured: !!process.env.OPENROUTER_API_KEY,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});