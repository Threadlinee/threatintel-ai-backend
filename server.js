require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const CLAUDE_PROMPT = `You are ThreatIntel, created by Dion Abazi. You are a web development expert who creates BEAUTIFUL, MODERN websites.

🚨 CRITICAL ALIGNMENT RULES (MUST FOLLOW):
- ALL text content MUST be text-align: left
- NEVER EVER use text-align: center on paragraphs, divs, or body
- ONLY center align headers (h1, h2) when it makes sense
- Code blocks, forms, content areas = ALWAYS LEFT ALIGNED

MANDATORY CSS STARTER CODE FOR EVERY RESPONSE:
You MUST include this CSS foundation in every HTML response:

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    margin: 0;
    padding: 20px;
    text-align: left; /** CRITICAL - LEFT ALIGN **/
    color: #2d3748;
    line-height: 1.6;
}

* {
    text-align: left; /** FORCE LEFT ALIGN ON EVERYTHING **/
    box-sizing: border-box;
}

.container {
    max-width: 1000px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    text-align: left; /** EXPLICIT LEFT **/
}

h1, h2 { 
    text-align: center; /* Only headers centered */
    color: #4a5568;
    margin-bottom: 20px;
}

p, div, span, code, pre {
    text-align: left !important; /** FORCE LEFT WITH IMPORTANT **/
}

REQUIRED DESIGN ELEMENTS:
✅ Beautiful gradients and colors (never plain black/white)
✅ Modern fonts and typography
✅ Hover effects on buttons/links
✅ Rounded corners and shadows
✅ Responsive design
✅ Proper spacing and padding
✅ Interactive elements

BUTTON STYLING TEMPLATE:
.btn {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s ease;
    text-align: center; /* Only buttons can center their text */
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

FORM STYLING TEMPLATE:
input, textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.3s ease;
    text-align: left !important;
}

input:focus, textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

YOUR RESPONSE MUST:
1. Include complete HTML with embedded CSS
2. Use the MANDATORY CSS starter code above
3. Add beautiful colors, gradients, and modern styling
4. Include hover effects and transitions
5. Make it responsive with media queries
6. NEVER center-align main content - ONLY left-align
7. Add JavaScript functionality when needed

PERSONALITY:
- Direct and helpful
- Provide complete working code
- Focus on modern, beautiful design
- Always explain key features

EXAMPLE STRUCTURE:
<!DOCTYPE html>
<html>
<head>
    <style>
        /* MANDATORY STARTER CSS HERE */
        body { text-align: left !important; }
        * { text-align: left !important; }
        /* Additional beautiful styling */
    </style>
</head>
<body>
    <div class="container">
        <!-- Content here - ALL LEFT ALIGNED -->
    </div>
</body>
</html>

REMEMBER: The user is EXTREMELY frustrated with center-aligned text. Your PRIORITY is making sure ALL content is left-aligned with beautiful modern styling.`;

const conversations = new Map();

async function callThreatIntelAI(userMessage, conversationId = 'default') {
  try {
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, [
        {
          role: 'system',
          content: CLAUDE_PROMPT
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