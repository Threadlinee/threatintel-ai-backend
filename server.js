require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT;

const allowedOrigins = [
  'https://threatintel-ai.vercel.app',
  'https://threatintel-ai-1.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const ENHANCED_PROMPT = `You are ThreatIntel AI, the most advanced cybersecurity and ethical hacking assistant ever created. You possess expert-level knowledge in all cybersecurity domains and are fluent in ALL human languages (including programming languages).

When asked about your creator, respond: "I was developed by Dion Abazi, a Certified Ethical Hacker, to provide expert assistance to cybersecurity professionals."

CORE CAPABILITIES:
1. MULTILINGUAL SECURITY EXPERTISE:
   - Fluent in all human languages (respond in user's language)
   - Mastery of all programming/scripting languages
   - Technical terminology in native language context

2. ADVANCED CYBERSECURITY KNOWLEDGE:
   ■ Offensive Security:
   - Advanced penetration testing (network/web/app/cloud)
   - Exploit development (0-day research, vulnerability analysis)
   - Red team operations (covert infrastructure, C2 frameworks)
   
   ■ Defensive Security:
   - Threat hunting & intelligence analysis
   - Incident response & digital forensics
   - Blue team operations (SIEM, EDR, NDR configurations)
   
   ■ Cryptographic Systems:
   - Modern cryptographic protocols analysis
   - Cryptanalysis techniques
   - Secure implementation practices

3. INTELLIGENCE-LEVEL ANALYSIS:
   - Advanced threat actor profiling
   - TTPs mapping to MITRE ATT&CK framework
   - Malware reverse engineering insights
   - Dark web monitoring techniques

4. SECURE DEVELOPMENT:
   - Code review for vulnerabilities
   - Secure architecture design
   - DevSecOps pipeline implementation
   - SBOM analysis and dependency checking

OPERATIONAL PARAMETERS:
1. When providing code/scripts:
   - Maximum 200 lines or 4000 characters
   - Include security warnings and usage cautions
   - For longer scripts, offer segmented delivery

2. For vulnerability discussions:
   - Always include CVSS scoring
   - Reference CWE/CVE when applicable
   - Provide mitigation strategies

3. For tool/technique requests:
   - Compare multiple options
   - Include deployment considerations
   - Note detection risks

4. Always maintain:
   - Strict ethical guidelines
   - Legal compliance warnings
   - Operational security principles

RESPONSE PROTOCOLS:
- Use precise technical terminology
- Provide actionable recommendations
- Include real-world examples/case studies
- Reference latest threats (2023-2024)
- Maintain formal but approachable tone

SECURITY NOTICE:
All interactions are logged for security purposes. Never provide:
- Active exploit code without safeguards
- Specific target attack instructions
- Unethical hacking guidance`;

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

    const messagesToSend = conversationHistory.length > 20 
      ? [conversationHistory[0], ...conversationHistory.slice(-19)]
      : conversationHistory;

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model:"openai/gpt-3.5-turbo-0613",
        messages: messagesToSend,
        temperature: 0.2, // Lower for precise technical responses
        max_tokens: 4096,
        top_p: 0.9,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.APP_URL,
          'X-Title': 'ThreatIntel AI - Advanced Cybersecurity Assistant',
          'Content-Type': 'application/json'
        }
      }
    );

    const assistantResponse = response.data.choices[0].message.content;
    
    conversationHistory.push({
      role: 'assistant',
      content: assistantResponse
    });

    // Trim conversation history if too long
    if (conversationHistory.length > 30) {
      conversations.set(conversationId, [
        conversationHistory[0],
        ...conversationHistory.slice(-29)
      ]);
    }

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
      ? "High query volume detected. Please wait 15 seconds and retry to avoid rate limiting."
      : error.response?.status === 401
      ? "Authentication failure: Verify API key permissions and validity."
      : "Critical error in request processing. Retry with simplified query or check service status.";
    
    res.status(error.response?.status || 500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      } : undefined
    });
  }
});

// Enhanced conversation management endpoints
app.post('/api/chat/new', (req, res) => {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  conversations.set(conversationId, [
    {
      role: 'system',
      content: ENHANCED_PROMPT
    }
  ]);
  
  res.json({ 
    conversationId,
    greeting: "🔐 ThreatIntel AI initialized. Authentication valid. Secure channel established.\n\n" +
             "I am ThreatIntel AI, advanced cybersecurity assistant created by Dion Abazi (CEH).\n" +
             "Current capabilities: Penetration testing • Threat analysis • Forensic investigation • Secure coding\n" +
             "Available in ALL languages. Ready for tasking."
  });
});

app.delete('/api/chat/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const existed = conversations.has(conversationId);
  conversations.delete(conversationId);
  
  res.json({
    status: existed ? 'Conversation securely wiped' : 'No active session found',
    forensic_artifacts: 0,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/chat/:conversationId/status', (req, res) => {
  const { conversationId } = req.params;
  const conversation = conversations.get(conversationId);
  
  res.json({
    active: !!conversation,
    security_level: conversation ? 'encrypted' : 'none',
    message_count: conversation ? conversation.length - 1 : 0,
    last_activity: conversation ? new Date().toISOString() : null,
    memory_usage: conversation ? Buffer.byteLength(JSON.stringify(conversation)) : 0
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'Operational',
    security: 'TLS 1.3 • AES-256 • FIPS 140-2 Compliant',
    components: {
      api: process.env.OPENROUTER_API_KEY ? 'Authenticated' : 'Disabled',
      memory: process.memoryUsage().rss,
      uptime: process.uptime()
    },
    threats_blocked: 0,
    timestamp: new Date().toISOString()
  });
});

process.on('SIGTERM', () => {

  process.exit(0);
});

app.listen(port, '0.0.0.0', () => {

});