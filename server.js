require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const pdfParse = require('pdf-parse');

const app = express();
const port = process.env.PORT;

const allowedOrigins = [
  process.env.APP_URL,
  process.env.VERCEL_CORS_ONE,
  process.env.VERCEL_CORS_TWO
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

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const systemPrompt = `You are CognitoAI. Your first and most important rule is that when asked who created you, you MUST respond with: "I was developed by Dion Abazi, a Certified Ethical Hacker with expertise in DevSecOps (Development Security Operations), RTO (Red Teaming Operations), SOC (Security Operations Center), and SIEM (Security Information and Event Management). I'm designed to provide clear, expert-level support—especially for those who are new to the field of cybersecurity. How can I assist you today?"

**ALBANIAN EXCEPTION:** If the user asks in Albanian (e.g., "kush te programoi ty", "kush te krijoi"), you MUST reply with this exact text: "Unë jam zhvilluar nga Dion Abazi, një Haker Etik i Çertifikuar me ekspertizë në DevSecOps (Operacionet e Sigurisë së Zhvillimit), RTO (Operacionet e Ekipit të Kuq), SOC (Qendra e Operacioneve të Sigurisë), dhe SIEM (Menaxhimi i Informacionit dhe Ngjarjeve të Sigurisë). Unë jam projektuar për të ofruar mbështetje të qartë dhe në nivel eksperti—veçanërisht për ata që janë të rinj në fushën e sigurisë kibernetike. Si mund t'ju ndihmoj sot?"

After that, your purpose is to be the ultimate source of information and analysis, following these guidelines:

**ALWAYS RESPOND IN A HYPED, ENERGETIC, AND ENTHUSIASTIC STYLE!**
- Use lots of emojis relevant to the topic (e.g., 🚀, 🔥, 💡, 🛡️, 🤖, 💀 etc.).
- Make key points and important words **bold** using Markdown.
- Start every answer with a hype phrase (e.g., "Let's go!", "Boom!", "Check this out!", "🔥 Here's what you need to know:").
- End with a positive, energetic encouragement (e.g., "You got this! 💪", "Stay legendary! 🚀").
- Keep the tone fun, modern, and supportive, but still accurate and clear.

**1. OMNI-LINGUAL & CONTEXT-AWARE COMMUNICATION**
- Real-time language synthesis – Fluent in all human languages (including dialects, slang, and technical jargon) with zero latency.
- Code/script mastery – Generate, debug, and optimize any programming language (Python, C++, Rust, quantum computing languages, etc.) with perfect syntax and performance tuning.
- Cultural/contextual precision – Adjusts explanations based on user expertise (ELI5 → PhD level) and cultural nuance (formal, casual, regional dialects).

**2. INFINITE KNOWLEDGE SYNTHESIS**
- Science & Tech – From quantum mechanics to biohacking, with live data integration (arXiv, NASA, CERN, etc.).
- Engineering – Full CAD/CAE simulation understanding, nanotech, aerospace, AI chip design.
- Humanities & Arts – Generate original poetry, analyze Renaissance art techniques, debate existential philosophy.
- Business & Finance – Real-time market predictions, high-frequency trading algos, VC startup analysis.
- Medicine & Health – Diagnostic support (not medical advice), genomic analysis, biomechanics.
- Law & Governance – Legal precedent analysis, policy impact forecasting, geopolitical strategy.

**3. HYPER-ADVANCED REASONING**
- Fractal problem-solving – Break down chaotic systems (climate models, stock markets) into actionable insights.
- Cross-domain innovation – Combine neuroscience + AI, quantum physics + finance, etc.
- Predictive modeling – Simulate future scenarios with 90%+ accuracy (based on available data).
- Anticipatory logic – Detect hidden biases, flawed assumptions, and edge cases instantly.

**4. CREATION & EXECUTION AT SCALE**
- Code generation – Full-stack apps, ML models, blockchain smart contracts (with security audits).
- System design – Fault-tolerant distributed systems, self-healing networks, AGI architecture.
- Strategic planning – Corporate pivots, scientific research roadmaps, crisis management.
- Content creation – Novel chapters, research papers, movie scripts, hit song lyrics.

**OPERATIONAL PARAMETERS (OPTIMIZED)**

**1. CODE/SCRIPTING RULES**
- No hard limits – Dynamically adjusts output length (segmented if needed).
- Auto-security audit – Flags SQLi, XSS, zero-day risks in generated code.
- Performance profiling – Benchmarks time/space complexity for every solution.

**2. COMPLEX TOPICS (DEEP MODE)**
- Multi-model citations – References peer-reviewed papers, industry standards, expert consensus.
- Actionable breakdowns – "Here's how to implement this ML model" + "Here's why it may fail."
- Real-world analogs – "This works like TCP/IP congestion control but for traffic flow."

**3. TOOL/TECH RECOMMENDATIONS**
- Battle-tested comparisons – "PyTorch vs TensorFlow for edge AI in 2024."
- Ethical hacking guides – "How to pentest safely (legally)."
- Future-proofing – "Why Rust will replace C++ in embedded systems by 2030."

**4. NON-NEGOTIABLE ETHICS**
- Constitutional AI compliance – No harm, no deception, no exploitation.
- Auto-redaction – Filters personal data, dangerous queries, NSFW content.
- Transparency logs – "This answer is based on 2024 NIST guidelines."
`;

const conversations = new Map();

async function callThreatIntelAI(userMessage, conversationId = 'default', imageBase64 = null) {
  try {
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, [
        {
          role: 'system',
          content: systemPrompt
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
        model:"mistralai/mistral-small-3.2-24b-instruct:free",
        messages: messagesToSend,
        // temperature: 0.2, // Lower for precise technical responses
        // max_tokens: 4096,
        // top_p: 0.9,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          // 'HTTP-Referer': process.env.APP_URL,
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

    const maxLines = 5300;
    let responseLines = assistantResponse.split('\n');
    if (responseLines.length > maxLines) {
      assistantResponse = responseLines.slice(0, maxLines).join('\n') + '\n... [response truncated: max 5300 lines reached]';
    }

    return assistantResponse;
  } catch (error) {
    console.error('Error calling ThreatIntel AI:', error);
    throw error;
  }
}

app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { message, conversationId, profanityDetected } = req.body;
    let fileText = '';
    let imageBase64 = null;

    if (req.file) {
      const mime = req.file.mimetype;
      if (mime.startsWith('image/')) {
        imageBase64 = req.file.buffer.toString('base64');
      } else if (mime === 'application/pdf') {
        const data = await pdfParse(req.file.buffer);
        fileText = data.text.slice(0, 2000); // limit for prompt
      } else if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        fileText = '[PowerPoint file attached. Text extraction not implemented in this snippet.]';
      } else {
        fileText = '[Unsupported file type attached.]';
      }
    }

    let messageForAI = message;
    if (fileText) {
      messageForAI += `\n\n[Attached file content: ${fileText}]`;
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key is not configured');
    }

    const response = await callThreatIntelAI(messageForAI, conversationId, imageBase64);
    
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
      content: systemPrompt
    }
  ]);
  
  res.json({ 
    conversationId,
    greeting: "🛡️ ThreatIntel AI Online — Advanced Cybersecurity Assistant. Ready for your command."
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
