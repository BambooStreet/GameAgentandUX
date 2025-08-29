const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📨 Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AI_CONFIGS = {
  ai1: {
    model: process.env.AI1_MODEL || 'gpt-3.5-turbo',
    systemPrompt: process.env.AI1_SYSTEM_PROMPT || 'You are AI1, an analytical and data-focused assistant.',
    name: 'AI1'
  },
  ai2: {
    model: process.env.AI2_MODEL || 'gpt-3.5-turbo',
    systemPrompt: process.env.AI2_SYSTEM_PROMPT || 'You are AI2, a helpful and supportive assistant.',
    name: 'AI2'
  },
  ai3: {
    model: process.env.AI3_MODEL || 'gpt-3.5-turbo',
    systemPrompt: process.env.AI3_SYSTEM_PROMPT || 'You are AI3, a creative and innovative assistant.',
    name: 'AI3'
  },
  ai4: {
    model: process.env.AI4_MODEL || 'gpt-3.5-turbo',
    systemPrompt: process.env.AI4_SYSTEM_PROMPT || 'You are AI4, a technical and implementation-focused assistant.',
    name: 'AI4'
  }
};

const conversationHistories = {
  ai1: [],
  ai2: [],
  ai3: [],
  ai4: []
};

// 통계 추적
let requestStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  aiUsage: {
    ai1: 0,
    ai2: 0,
    ai3: 0,
    ai4: 0
  },
  startTime: new Date()
};

async function getAIResponse(aiId, message, conversationHistory) {
  const config = AI_CONFIGS[aiId];
  if (!config) {
    throw new Error(`Invalid AI ID: ${aiId}`);
  }

  console.log(`🤖 [${aiId.toUpperCase()}] Processing message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);  
  const startTime = Date.now();

  try {
    const messages = [
      { role: 'system', content: config.systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log(`📡 [${aiId.toUpperCase()}] Sending request to OpenAI (${messages.length} messages in context)`);
    
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseTime = Date.now() - startTime;
    const response = completion.choices[0].message.content;
    
    console.log(`✅ [${aiId.toUpperCase()}] Response received (${responseTime}ms): "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);  
    console.log(`📊 [${aiId.toUpperCase()}] Tokens used: ${completion.usage?.total_tokens || 'unknown'}`);
    
    // 통계 업데이트
    requestStats.aiUsage[aiId]++;
    
    return response;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ [${aiId.toUpperCase()}] Error after ${responseTime}ms:`, error.message);
    throw error;
  }
}

app.post('/api/chat', async (req, res) => {
  requestStats.totalRequests++;
  
  try {
    const { message, aiId, conversationId } = req.body;

    if (!message || !aiId) {
      console.log('❌ Bad request: Missing message or aiId');
      requestStats.failedRequests++;
      return res.status(400).json({ 
        error: 'Message and AI ID are required' 
      });
    }

    if (!AI_CONFIGS[aiId]) {
      console.log(`❌ Bad request: Invalid AI ID '${aiId}'`);
      requestStats.failedRequests++;
      return res.status(400).json({ 
        error: `Invalid AI ID: ${aiId}` 
      });
    }

    const conversationHistory = conversationHistories[aiId] || [];
    console.log(`💬 [${aiId.toUpperCase()}] Conversation history length: ${conversationHistory.length}`);
    
    const response = await getAIResponse(aiId, message, conversationHistory);

    conversationHistories[aiId].push(
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    );

    if (conversationHistories[aiId].length > 20) {
      conversationHistories[aiId] = conversationHistories[aiId].slice(-20);
      console.log(`🗑️ [${aiId.toUpperCase()}] History trimmed to 20 messages`);
    }

    const responseData = {
      success: true,
      response: response,
      aiId: aiId,
      aiName: AI_CONFIGS[aiId].name,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📤 Sending response for ${aiId.toUpperCase()}`);
    requestStats.successfulRequests++;
    res.json(responseData);

  } catch (error) {
    console.error('💥 Chat API error:', error.message);
    requestStats.failedRequests++;
    res.status(500).json({
      success: false,
      error: 'Failed to get AI response',
      details: error.message
    });
  }
});

app.post('/api/chat/multiple', async (req, res) => {
  requestStats.totalRequests++;
  
  try {
    const { message, aiIds } = req.body;

    if (!message || !aiIds || !Array.isArray(aiIds)) {
      console.log('❌ Bad request: Missing message or aiIds array');
      requestStats.failedRequests++;
      return res.status(400).json({ 
        error: 'Message and AI IDs array are required' 
      });
    }

    console.log(`🚀 Multiple AI request for ${aiIds.length} AIs: [${aiIds.join(', ')}]`);
    const startTime = Date.now();

    const responses = await Promise.allSettled(
      aiIds.map(async (aiId) => {
        if (!AI_CONFIGS[aiId]) {
          throw new Error(`Invalid AI ID: ${aiId}`);
        }

        const conversationHistory = conversationHistories[aiId] || [];
        const response = await getAIResponse(aiId, message, conversationHistory);

        conversationHistories[aiId].push(
          { role: 'user', content: message },
          { role: 'assistant', content: response }
        );

        if (conversationHistories[aiId].length > 20) {
          conversationHistories[aiId] = conversationHistories[aiId].slice(-20);
        }

        return {
          aiId,
          aiName: AI_CONFIGS[aiId].name,
          response,
          timestamp: new Date().toISOString()
        };
      })
    );

    const successfulResponses = responses
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    const failedResponses = responses
      .filter(result => result.status === 'rejected')
      .map(result => result.reason.message);

    const totalTime = Date.now() - startTime;
    console.log(`✨ Multiple AI request completed in ${totalTime}ms`);
    console.log(`📊 Success: ${successfulResponses.length}, Failed: ${failedResponses.length}`);

    if (failedResponses.length === 0) {
      requestStats.successfulRequests++;
    } else {
      requestStats.failedRequests++;
      console.log('⚠️ Some AI requests failed:', failedResponses);
    }

    res.json({
      success: true,
      responses: successfulResponses,
      errors: failedResponses,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Multiple chat API error:', error.message);
    requestStats.failedRequests++;
    res.status(500).json({
      success: false,
      error: 'Failed to get AI responses',
      details: error.message
    });
  }
});

app.get('/api/status', (req, res) => {
  const uptime = Math.floor((Date.now() - requestStats.startTime.getTime()) / 1000);
  
  res.json({
    status: 'running',
    aiConfigs: Object.keys(AI_CONFIGS),
    timestamp: new Date().toISOString(),
    uptime: uptime,
    stats: {
      totalRequests: requestStats.totalRequests,
      successfulRequests: requestStats.successfulRequests,
      failedRequests: requestStats.failedRequests,
      successRate: requestStats.totalRequests > 0 
        ? Math.round((requestStats.successfulRequests / requestStats.totalRequests) * 100) 
        : 0,
      aiUsage: requestStats.aiUsage,
      conversationLengths: {
        ai1: conversationHistories.ai1.length,
        ai2: conversationHistories.ai2.length,
        ai3: conversationHistories.ai3.length,
        ai4: conversationHistories.ai4.length
      }
    }
  });
});

// 대시보드 페이지 (루트 경로)
app.get('/', (req, res) => {
  const uptime = Math.floor((Date.now() - requestStats.startTime.getTime()) / 1000);
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>AI Chat Server Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 40px; background: #f5f5f7; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h1 { color: #1d1d1f; margin-bottom: 30px; text-align: center; }
        .status { background: #30d158; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .card { background: #f6f6f6; padding: 20px; border-radius: 8px; text-align: center; }
        .card h3 { margin: 0 0 10px 0; color: #1d1d1f; }
        .card .number { font-size: 24px; font-weight: bold; color: #007aff; margin: 10px 0; }
        .ai-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .ai-card { background: linear-gradient(135deg, #007aff, #5856d6); color: white; padding: 15px; border-radius: 8px; text-align: center; }
        .ai1 { background: linear-gradient(135deg, #3498db, #2980b9); }
        .ai2 { background: linear-gradient(135deg, #2ecc71, #27ae60); }
        .ai3 { background: linear-gradient(135deg, #f39c12, #e67e22); }
        .ai4 { background: linear-gradient(135deg, #e74c3c, #c0392b); }
        .refresh-btn { background: #007aff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 20px auto; display: block; }
        .refresh-btn:hover { background: #0056cc; }
        .log { background: #1d1d1f; color: #f5f5f7; padding: 20px; border-radius: 8px; margin: 20px 0; font-family: 'SF Mono', Monaco, monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
        .endpoints { background: #f6f6f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .endpoints h3 { margin-top: 0; }
        .endpoints code { background: #e5e5ea; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; }
    </style>
    <script>
        function refreshData() {
            location.reload();
        }
        setInterval(refreshData, 30000); // 30초마다 자동 새로고침
    </script>
</head>
<body>
    <div class="container">
        <h1>🤖 AI Chat Server Dashboard</h1>
        
        <div style="text-align: center; margin-bottom: 30px;">
            <span class="status">🟢 RUNNING</span>
            <p style="margin: 10px 0; color: #86868b;">서버 가동시간: ${uptimeFormatted}</p>
            <p style="margin: 0; color: #86868b;">마지막 업데이트: ${new Date().toLocaleString()}</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>총 요청</h3>
                <div class="number">${requestStats.totalRequests}</div>
            </div>
            <div class="card">
                <h3>성공 요청</h3>
                <div class="number" style="color: #30d158;">${requestStats.successfulRequests}</div>
            </div>
            <div class="card">
                <h3>실패 요청</h3>
                <div class="number" style="color: #ff3b30;">${requestStats.failedRequests}</div>
            </div>
            <div class="card">
                <h3>성공률</h3>
                <div class="number">${requestStats.totalRequests > 0 ? Math.round((requestStats.successfulRequests / requestStats.totalRequests) * 100) : 0}%</div>
            </div>
        </div>

        <h3>AI 사용 현황</h3>
        <div class="ai-grid">
            <div class="ai-card ai1">
                <h4>AI1 (분석형)</h4>
                <div style="font-size: 20px; font-weight: bold;">${requestStats.aiUsage.ai1}회</div>
                <div style="font-size: 12px; opacity: 0.8;">${conversationHistories.ai1.length}개 메시지</div>
            </div>
            <div class="ai-card ai2">
                <h4>AI2 (도움형)</h4>
                <div style="font-size: 20px; font-weight: bold;">${requestStats.aiUsage.ai2}회</div>
                <div style="font-size: 12px; opacity: 0.8;">${conversationHistories.ai2.length}개 메시지</div>
            </div>
            <div class="ai-card ai3">
                <h4>AI3 (창의형)</h4>
                <div style="font-size: 20px; font-weight: bold;">${requestStats.aiUsage.ai3}회</div>
                <div style="font-size: 12px; opacity: 0.8;">${conversationHistories.ai3.length}개 메시지</div>
            </div>
            <div class="ai-card ai4">
                <h4>AI4 (기술형)</h4>
                <div style="font-size: 20px; font-weight: bold;">${requestStats.aiUsage.ai4}회</div>
                <div style="font-size: 12px; opacity: 0.8;">${conversationHistories.ai4.length}개 메시지</div>
            </div>
        </div>

        <div class="endpoints">
            <h3>📡 API 엔드포인트</h3>
            <p><strong>GET</strong> <code>/api/status</code> - 서버 상태 확인</p>
            <p><strong>POST</strong> <code>/api/chat</code> - 단일 AI 채팅</p>
            <p><strong>POST</strong> <code>/api/chat/multiple</code> - 다중 AI 채팅</p>
            <p><strong>POST</strong> <code>/api/clear-history</code> - 대화 기록 초기화</p>
        </div>

        <button class="refresh-btn" onclick="refreshData()">🔄 새로고침</button>
        
        <p style="text-align: center; color: #86868b; font-size: 14px; margin-top: 30px;">
            UI 접속: <strong>ai-chat-ui/index.html</strong> 파일을 브라우저에서 열어주세요
        </p>
    </div>
</body>
</html>
  `);
});

app.post('/api/clear-history', (req, res) => {
  const { aiId } = req.body;
  console.log(`🗑️ Clear history request for: ${aiId || 'undefined'}`);
  
  if (aiId && AI_CONFIGS[aiId]) {
    const previousLength = conversationHistories[aiId].length;
    conversationHistories[aiId] = [];
    console.log(`✅ History cleared for ${aiId} (${previousLength} messages removed)`);
    res.json({ success: true, message: `History cleared for ${aiId}` });
  } else if (aiId === 'all') {
    let totalCleared = 0;
    Object.keys(conversationHistories).forEach(id => {
      totalCleared += conversationHistories[id].length;
      conversationHistories[id] = [];
    });
    console.log(`✅ All conversation histories cleared (${totalCleared} total messages removed)`);
    res.json({ success: true, message: 'All conversation histories cleared' });
  } else {
    console.log(`❌ Invalid AI ID for clear history: ${aiId}`);
    res.status(400).json({ error: 'Invalid AI ID' });
  }
});

app.listen(port, () => {
  console.log(`AI Chat Server running on port ${port}`);
  console.log(`Available AIs: ${Object.keys(AI_CONFIGS).join(', ')}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY not set. Please configure your API key in .env file.');
  }
});