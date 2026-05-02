import { Log } from '../../logging_middleware/index.js';

const BASE_URL = 'http://20.207.122.201/evaluation-service';
const TIMEOUT_MS = 3000;
const MAX_RETRIES = 2;

// In-memory cache
const cache = new Map();
const TTL_MS = 60 * 1000; // 60 seconds

// In-flight requests map to prevent cache stampedes
const inFlightRequests = new Map();

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      if (isLastAttempt) {
        Log('backend', 'error', 'repository', `Fetch failed after ${retries} retries: ${url} - ${error.message}`);
        throw error;
      } else {
        Log('backend', 'warn', 'repository', `Fetch attempt ${attempt + 1} failed, retrying... ${url} - ${error.message}`);
      }
    }
  }
}

async function fetchWithCacheAndStampedeProtection(cacheKey, url, entityName) {
  // 1. Check if valid cached data exists
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    Log('backend', 'info', 'repository', `Cache hit for ${entityName}`);
    return cachedData;
  }

  // 2. Check for in-flight requests to prevent stampede
  if (inFlightRequests.has(cacheKey)) {
    Log('backend', 'info', 'repository', `Using in-flight request for ${entityName}`);
    return inFlightRequests.get(cacheKey);
  }

  Log('backend', 'info', 'repository', `Cache miss for ${entityName}. Fetching from API`);

  // 3. Fire the request and save its Promise in the inFlight map
  const fetchPromise = (async () => {
    try {
      let data = await fetchWithRetry(url, {
        headers: { 'Authorization': `Bearer ${process.env.TOKEN}` }
      });

      if (data && Array.isArray(data[entityName])) {
        data = data[entityName];
      } else if (!Array.isArray(data)) {
        throw new Error(`Invalid API response: ${entityName} should be an array or contain an array property`);
      }

      setCachedData(cacheKey, data);
      return data;
    } finally {
      // 4. Always clean up the in-flight map upon Promise resolution (success or error)
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function fetchDepots() {
  return fetchWithCacheAndStampedeProtection('depots', `${BASE_URL}/depots`, 'depots');
}

export async function fetchVehicles() {
  return fetchWithCacheAndStampedeProtection('vehicles', `${BASE_URL}/vehicles`, 'vehicles');
}
