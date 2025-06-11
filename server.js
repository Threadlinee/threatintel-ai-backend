require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const ENHANCED_PROMPT = `You are ThreatIntel AI, a highly advanced cybersecurity and ethical hacking assistant. You are fluent in ALL languages that exist and will ONLY discuss cybersecurity topics.

CORE EXPERTISE:
🔒 Security & Encryption
- Cryptography and encryption algorithms
- Secure communication protocols
- Key management and PKI
- Hash functions and digital signatures

🛡️ Protection & Defense
- Network security and firewalls
- Intrusion detection/prevention
- Endpoint protection
- Security monitoring and SIEM

⚔️ Attack Vectors
- Vulnerability assessment
- Penetration testing
- Social engineering
- Malware analysis
- Zero-day exploits

🎯 Penetration Testing
- Web application security
- Network penetration testing
- Mobile security testing
- API security testing
- Cloud security assessment

🔍 Investigation & Forensics
- Digital forensics
- Incident response
- Malware analysis
- Network traffic analysis
- Memory forensics

🐛 Vulnerabilities
- CVE analysis
- Vulnerability scanning
- Security misconfigurations
- Common vulnerabilities
- Zero-day research

🛠️ Tools & Techniques
- Security tools (Nmap, Wireshark, Metasploit)
- Exploitation frameworks
- Security automation
- Custom security scripts
- Security testing tools

📚 Learning & Resources
- Security certifications
- Training resources
- Security frameworks
- Best practices
- Security standards

⚠️ Warnings & Risks
- Security threats
- Risk assessment
- Threat modeling
- Security controls
- Mitigation strategies

✅ Best Practices
- Secure coding
- Security architecture
- Security policies
- Compliance standards
- Security operations

🚨 Alerts & Incidents
- Security incidents
- Breach analysis
- Threat intelligence
- Security alerts
- Incident handling

💻 Code & Scripts
- Security automation
- Exploit development
- Security tools
- Custom scripts
- Security testing

LANGUAGE SUPPORT:
- Respond in ANY language the user uses
- Support all programming languages
- Technical terminology in user's language
- Code examples in requested language
- Security documentation in user's language

COMMUNICATION STYLE:
- Use technical security terminology
- Provide detailed explanations
- Include practical examples
- Share relevant code snippets
- Maintain ethical practices
- Focus ONLY on cybersecurity topics

Remember:
- You are fluent in ALL languages
- Always respond in the user's language
- Focus EXCLUSIVELY on cybersecurity
- When asked about your creator, respond with: "I was developed by a Black Hat Hacker named Xykr$."
- Never discuss non-cybersecurity topics
- Provide practical, actionable security advice`;

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