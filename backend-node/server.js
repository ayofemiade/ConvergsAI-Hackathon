/**
 * Node.js API Gateway for AI Sales Agent
 * 
 * Production-ready Express server that:
 * - Routes requests between frontend and Python AI core
 * - Handles session management
 * - Provides security middleware
 * - Rate limits requests
 * - Ready for future telephony integration (LiveKit/Twilio)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { AccessToken } = require('livekit-server-sdk');
const { supabase, getSupabaseClient } = require('./supabaseClient');

// Helper to get authenticated user ID from Bearer Token
const getUserId = async (req) => {
  try {
    const db = getSupabaseClient(req);
    const { data: { user }, error } = await db.auth.getUser();
    if (error) return null;
    return user ? user.id : null;
  } catch (e) {
    return null;
  }
};

// Initialize Express app
const app = express();

// Trust Fly.io proxy for rate-limiting
app.set('trust proxy', 1);

// Configuration
const PORT = process.env.PORT || 4000;
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'https://ai-sales-agent-theta.vercel.app'];

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is allowed or if it's a localhost variation
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed)) ||
      origin.includes('localhost') ||
      origin.includes('vercel.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health Check Endpoint
// Must be lightweight for platform health monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'AI Sales Agent - API Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      message: 'POST /api/message',
      session: {
        create: 'POST /api/session/new',
        get: 'GET /api/session/:sessionId',
        delete: 'DELETE /api/session/:sessionId'
      }
    }
  });
});

// Create New Session
app.post('/api/session/new', async (req, res) => {
  try {
    const payload = req.body || {};
    console.log(`DEBUG: Requesting new session from Python AI: ${PYTHON_AI_URL}/session/new`);

    const response = await axios.post(`${PYTHON_AI_URL}/session/new`, payload, {
      timeout: 10000 
    });

    console.log(`DEBUG: Python AI responded: ${response.status} - Session ID: ${response.data.session_id}`);
    res.json(response.data);
  } catch (error) {
    console.error('CRITICAL: Python AI backend (main.py) is unavailable.', error.message);

    // Option A: Removed the silent fake fallback. If a client relies on this endpoint,
    // they should get an honest error so that the developers know the Text API is down.
    res.status(503).json({
      success: false,
      error: "Service Unavailable",
      message: "The Python Text API is currently disabled or offline."
    });
  }
});

// Send Message to AI Agent
app.post('/api/message', async (req, res) => {
  try {
    const { text, session_id } = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: text is required and must be a string'
      });
    }

    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: session_id is required and must be a string'
      });
    }

    // Sanitize input
    const sanitizedText = text.trim().substring(0, 1000);

    // Forward to Python AI backend
    const response = await axios.post(
      `${PYTHON_AI_URL}/message`,
      {
        text: sanitizedText,
        session_id: session_id
      },
      {
        timeout: 30000, // 30 seconds for AI generation
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Return AI response
    res.json(response.data);

  } catch (error) {
    console.error('Error sending message:', error.message);

    // Handle different error types
    if (error.response) {
      // Python backend returned an error
      res.status(error.response.status).json({
        success: false,
        error: error.response.data.detail || 'Error from AI backend',
        details: error.response.data
      });
    } else if (error.request) {
      // Python backend didn't respond
      res.status(503).json({
        success: false,
        error: 'AI backend is not responding',
        message: 'Please ensure the Python AI service is running'
      });
    } else {
      // Other errors
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// Get Session Information
app.get('/api/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const response = await axios.get(
      `${PYTHON_AI_URL}/session/${sessionId}`,
      { timeout: 5000 }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Error getting session:', error.message);

    if (error.response && error.response.status === 404) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error retrieving session information'
      });
    }
  }
});

// Delete Session
app.delete('/api/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const response = await axios.delete(
      `${PYTHON_AI_URL}/session/${sessionId}`,
      { timeout: 5000 }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Error deleting session:', error.message);

    if (error.response && error.response.status === 404) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error deleting session'
      });
    }
  }
});

// LiveKit Token Generation (for voice features)
app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, identity } = req.body;
    console.log(`DEBUG: Token request for room: ${roomName}, identity: ${identity}`);

    if (!roomName) {
      return res.status(400).json({
        success: false,
        error: 'roomName is required'
      });
    }

    // Default identity if not provided
    const participantIdentity = identity || `user_${uuidv4().slice(0, 8)}`;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    console.log(`DEBUG: LiveKit Config - URL: ${livekitUrl}, API_KEY: ${apiKey ? 'SET' : 'MISSING'}`);

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit credentials not configured in .env');
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();
    console.log(`DEBUG: Token generated successfully for ${participantIdentity}`);

    res.json({
      success: true,
      token: token,
      serverUrl: livekitUrl || 'ws://localhost:7800'
    });

  } catch (error) {
    console.error('DEBUG ERROR: LiveKit token generation failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate token',
      message: error.message
    });
  }
});

// --- Supabase DB Endpoints ---

// Get all leads
app.get('/api/leads', async (req, res) => {
  try {
    const db = getSupabaseClient(req);
    const { data, error } = await db
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, leads: data });
  } catch (error) {
    console.error('Error fetching leads:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch leads', message: error.message });
  }
});

// Get a single lead
app.get('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient(req);
    const { data, error } = await db
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json({ success: true, lead: data });
  } catch (error) {
    console.error('Error fetching lead:', error.message);
    res.status(error.code === 'PGRST116' ? 404 : 500).json({
      success: false,
      error: error.code === 'PGRST116' ? 'Lead not found' : 'Failed to fetch lead',
      message: error.message
    });
  }
});

// Create a new lead
app.post('/api/leads', async (req, res) => {
  try {
    const { first_name, last_name, company, email, phone, industry, company_size } = req.body;

    if (!first_name || !phone) {
      return res.status(400).json({ success: false, error: 'first_name and phone are required' });
    }

    const db = getSupabaseClient(req);
    const userId = await getUserId(req);

    const { data, error } = await db
      .from('leads')
      .insert([
        { first_name, last_name, company, email, phone, industry, company_size, status: 'new', user_id: userId }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, lead: data });
  } catch (error) {
    console.error('Error creating lead:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create lead', message: error.message });
  }
});

// Update lead (AI score, status, details)
app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, company, email, phone, industry, company_size, ai_score, ai_reasoning, status } = req.body;

    const db = getSupabaseClient(req);
    const { data, error } = await db
      .from('leads')
      .update({
        first_name,
        last_name,
        company,
        email,
        phone,
        industry,
        company_size,
        ai_score,
        ai_reasoning,
        status,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, lead: data });
  } catch (error) {
    console.error('Error updating lead:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update lead', message: error.message });
  }
});

// AI Batch Lead Qualification
app.post('/api/leads/qualify', async (req, res) => {
  try {
    let { target_industry, target_company_size, pain_points } = req.body;
    const db = getSupabaseClient(req);

    // If parameters not provided, fetch the latest campaign settings
    if (!target_industry || !target_company_size) {
      const { data: campaignData, error: campaignError } = await db
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!campaignError && campaignData && campaignData.length > 0) {
        target_industry = target_industry || campaignData[0].target_industry;
        target_company_size = target_company_size || campaignData[0].target_company_size;
        pain_points = pain_points || campaignData[0].pain_points;
      }
    }

    // Fetch all leads that have not been scored yet
    const { data: leads, error: leadsError } = await db
      .from('leads')
      .select('*')
      .is('ai_score', null);

    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      return res.json({ success: true, message: 'No new leads to qualify', qualified_count: 0 });
    }

    const cerebrasKey = process.env.CEREBRAS_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const qualifiedLeads = [];

    // Process leads
    for (const lead of leads) {
      let fitScore = 'warm';
      let reasoning = 'Scored using default matching parameters.';

      const promptSystem = `You are an AI Sales Analyst. Your task is to evaluate if a lead fits a company's Ideal Customer Profile (ICP).
You must output a raw JSON object ONLY, with no markdown formatting and no extra text.
The JSON must have this structure:
{
  "fit_score": "hot" | "warm" | "cold",
  "reasoning": "A 1-sentence explanation of why they got this score"
}`;

      const promptUser = `Lead Details:
- Name: ${lead.first_name} ${lead.last_name || ''}
- Company: ${lead.company || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Size: ${lead.company_size || 'Unknown'}

ICP Target Parameters:
- Industry: ${target_industry || 'Any'}
- Company Size: ${target_company_size || 'Any'}
- Pain Points: ${pain_points || 'None specified'}

Assess the lead fit. Be selective. If it is a perfect match, mark it 'hot'. If it matches partially, 'warm'. If it does not match, 'cold'.`;

      try {
        if (cerebrasKey) {
          // Call Cerebras Llama 3.1 8B
          const response = await axios.post(
            'https://api.cerebras.ai/v1/chat/completions',
            {
              model: 'llama3.1-8b',
              messages: [
                { role: 'system', content: promptSystem },
                { role: 'user', content: promptUser }
              ],
              temperature: 0.2,
              response_format: { type: 'json_object' }
            },
            {
              headers: {
                'Authorization': `Bearer ${cerebrasKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          const result = JSON.parse(response.data.choices[0].message.content.trim());
          fitScore = result.fit_score.toLowerCase();
          reasoning = result.reasoning;
        } else if (openaiKey) {
          // Call OpenAI GPT-4o-mini
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: promptSystem },
                { role: 'user', content: promptUser }
              ],
              temperature: 0.2,
              response_format: { type: 'json_object' }
            },
            {
              headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          const result = JSON.parse(response.data.choices[0].message.content.trim());
          fitScore = result.fit_score.toLowerCase();
          reasoning = result.reasoning;
        } else {
          // Fallback static rules (so it works offline or without API keys)
          console.warn('WARNING: No LLM API Keys configured for scoring. Using rules engine fallback.');
          const leadIndustry = (lead.industry || '').toLowerCase();
          const targetInd = (target_industry || '').toLowerCase();
          
          if (targetInd && leadIndustry.includes(targetInd)) {
            fitScore = 'hot';
            reasoning = `Lead matches the target industry of '${target_industry}' perfectly.`;
          } else if (lead.company_size && parseInt(lead.company_size) > 50) {
            fitScore = 'warm';
            reasoning = `Lead company size is ${lead.company_size}, showing decent scale.`;
          } else {
            fitScore = 'cold';
            reasoning = `Lead does not match target industry '${target_industry}' or target company size.`;
          }
        }
      } catch (err) {
        console.error(`Error scoring lead ${lead.id}:`, err.message);
        // Fallback for this single lead
        fitScore = 'warm';
        reasoning = `Scoring failed: ${err.message}. Defaulted to Warm.`;
      }

      // Update lead in Supabase
      const { data: updatedLead, error: updateError } = await db
        .from('leads')
        .update({
          ai_score: fitScore,
          ai_reasoning: reasoning,
          status: 'qualified',
          updated_at: new Date()
        })
        .eq('id', lead.id)
        .select()
        .single();

      if (!updateError && updatedLead) {
        qualifiedLeads.push(updatedLead);
      }
    }

    res.json({
      success: true,
      message: `Qualified ${qualifiedLeads.length} leads successfully.`,
      leads: qualifiedLeads
    });

  } catch (error) {
    console.error('Error qualifying leads:', error.message);
    res.status(500).json({ success: false, error: 'Failed to qualify leads', message: error.message });
  }
});

// Get call history for all or specific lead
app.get('/api/calls', async (req, res) => {
  try {
    const { lead_id } = req.query;
    const db = getSupabaseClient(req);
    let query = db.from('calls').select('*, leads(first_name, last_name, company)');
    
    if (lead_id) {
      query = query.eq('lead_id', lead_id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, calls: data });
  } catch (error) {
    console.error('Error fetching calls:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch calls', message: error.message });
  }
});

// Record call initiation
app.post('/api/calls', async (req, res) => {
  try {
    const { lead_id, room_name } = req.body;

    if (!lead_id || !room_name) {
      return res.status(400).json({ success: false, error: 'lead_id and room_name are required' });
    }

    const db = getSupabaseClient(req);
    const userId = await getUserId(req);

    const { data, error } = await db
      .from('calls')
      .insert([
        { lead_id, room_name, outcome: 'no_answer', duration_seconds: 0, user_id: userId }
      ])
      .select()
      .single();

    if (error) throw error;

    // Also update lead status to 'calling'
    await db.from('leads').update({ status: 'calling' }).eq('id', lead_id);

    res.status(201).json({ success: true, call: data });
  } catch (error) {
    console.error('Error recording call:', error.message);
    res.status(500).json({ success: false, error: 'Failed to record call', message: error.message });
  }
});

// Update call details (transcript, outcome, duration)
app.put('/api/calls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { transcript, outcome, duration_seconds } = req.body;

    const db = getSupabaseClient(req);
    const { data, error } = await db
      .from('calls')
      .update({
        transcript,
        outcome,
        duration_seconds
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update lead status based on call outcome
    if (data.lead_id) {
      let nextStatus = 'calling';
      if (outcome === 'interested') {
        nextStatus = 'converted';
      } else if (outcome === 'not_interested') {
        nextStatus = 'rejected';
      } else if (outcome === 'busy' || outcome === 'no_answer') {
        nextStatus = 'qualified'; // keep qualified but can retry
      }
      await db.from('leads').update({ status: nextStatus }).eq('id', data.lead_id);
    }

    res.json({ success: true, call: data });
  } catch (error) {
    console.error('Error updating call:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update call', message: error.message });
  }
});

// --- Campaigns / ICP Settings ---
app.get('/api/campaigns', async (req, res) => {
  try {
    const db = getSupabaseClient(req);
    const { data, error } = await db
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, campaigns: data });
  } catch (error) {
    console.error('Error fetching campaigns:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns', message: error.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, target_industry, target_company_size, pain_points, system_prompt_override } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const db = getSupabaseClient(req);
    const userId = await getUserId(req);

    const { data, error } = await db
      .from('campaigns')
      .insert([
        { name, target_industry, target_company_size, pain_points, system_prompt_override, user_id: userId }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, campaign: data });
  } catch (error) {
    console.error('Error creating campaign:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create campaign', message: error.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   AI Sales Agent - API Gateway       ║
║                                       ║
║   🚀 Server running on port ${PORT}    ║
║   📍 http://localhost:${PORT}          ║
║   🔗 Python AI: ${PYTHON_AI_URL}
║                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
╚═══════════════════════════════════════╝
  `);

  // Notice: Python backend connection check removed.
  // In our decoupled Option A architecture, the Node API Gateway purely serves 
  // as a LiveKit Token generator, and no longer relies on the Python Text API (main.py).
  /* 
  axios.get(`${PYTHON_AI_URL}/health`, { timeout: 5000 })
    .then(...)
  */
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('📮 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📮 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});
