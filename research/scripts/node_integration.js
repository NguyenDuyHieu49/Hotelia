/**
 * Node.js Integration for Hotel Ranking Service
 * Calls Python FastAPI for recommendations
 */

const axios = require('axios');

// Configuration
const RANKING_API_URL = process.env.RANKING_API_URL || 'http://localhost:8000';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = new Map();

/**
 * Get cached recommendations
 */
function getCached(sessionId) {
  const key = `rank:${sessionId}`;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  return null;
}

/**
 * Cache recommendations
 */
function setCached(sessionId, data) {
  const key = `rank:${sessionId}`;
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Call ranking API
 */
async function getRecommendations(sessionId, cityId, device, platform, candidateItems) {
  // Check cache first
  const cached = getCached(sessionId);
  if (cached) {
    console.log(`Cache hit for session ${sessionId}`);
    return cached;
  }

  try {
    const response = await axios.post(`${RANKING_API_URL}/rank`, {
      session_id: sessionId,
      city_id: cityId,
      device: device,
      platform: platform,
      candidate_items: candidateItems,
      timestamp: new Date().toISOString()
    });

    // Cache the response
    setCached(sessionId, response.data);

    return response.data;
  } catch (error) {
    console.error('Ranking API error:', error.message);

    // Fallback: return items in original order
    return {
      session_id: sessionId,
      ranked_items: candidateItems.map((id, idx) => ({
        item_id: id,
        score: 0,
        rank: idx + 1
      })),
      model_version: 'fallback',
      latency_ms: 0,
      fallback_used: true
    };
  }
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const response = await axios.get(`${RANKING_API_URL}/health`);
    return response.data;
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

// Export for use
module.exports = {
  getRecommendations,
  healthCheck
};

// CLI usage
if (require.main === module) {
  const [sessionId, cityId, device, platform, ...items] = process.argv.slice(2);

  if (!sessionId || !items.length) {
    console.log('Usage: node node_integration.js <sessionId> <cityId> <device> <platform> <item1> <item2> ...');
    process.exit(1);
  }

  console.log('Calling ranking API...');
  getRecommendations(sessionId, parseInt(cityId), device, platform, items)
    .then(result => {
      console.log('\nRanking Results:');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => console.error('Error:', err.message));
}
