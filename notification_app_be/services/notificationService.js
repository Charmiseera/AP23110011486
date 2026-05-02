import * as repository from '../repositories/notificationRepository.js';
import * as queueService from './queueService.js';
import { Log } from '../../logging_middleware/index.js';

const priorities = {
  placement: 3,
  result: 2,
  event: 1
};

// In-memory Query Cache Map
const queryCache = new Map();
const CACHE_TTL = 30 * 1000;

function getCacheKey(filters) {
  return JSON.stringify(filters);
}

export async function getFilteredNotifications(filters) {
  const cacheKey = getCacheKey(filters);
  const cached = queryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    Log('backend', 'info', 'service', 'Returning paginated notifications from cache');
    return cached.data;
  }

  Log('backend', 'info', 'service', 'Cache miss. Filtering notifications from repository.');
  
  let allNotifs = await repository.findAll();

  // Apply filters
  if (filters.studentId !== undefined) {
    allNotifs = allNotifs.filter(n => String(n.studentId) === String(filters.studentId));
  }
  if (filters.type) {
    allNotifs = allNotifs.filter(n => n.type === filters.type);
  }
  if (filters.isRead !== undefined) {
    const isReadBool = String(filters.isRead) === 'true';
    allNotifs = allNotifs.filter(n => n.isRead === isReadBool);
  }

  // Priority Sort Logic (Weight DESC, then createdAt DESC)
  allNotifs.sort((a, b) => {
    const pA = priorities[a.type] || 0;
    const pB = priorities[b.type] || 0;
    if (pA !== pB) {
      return pB - pA;
    }
    return b.createdAt - a.createdAt;
  });

  // Pagination Logic
  const limit = filters.limit ? parseInt(filters.limit, 10) : allNotifs.length;
  if (isNaN(limit) || limit < 0) {
    Log('backend', 'warn', 'service', `Invalid limit supplied: ${filters.limit}, ignoring pagination.`);
  }
  const paginated = isNaN(limit) ? allNotifs : allNotifs.slice(0, limit);

  // Set Cache
  queryCache.set(cacheKey, { data: paginated, timestamp: Date.now() });

  return paginated;
}

export async function createNotification(data) {
  queryCache.clear(); // Invalidate cache
  Log('backend', 'info', 'service', `Creating new notification for studentId: ${data.studentId}`);
  return repository.createNotification(data);
}

export async function markAsRead(id) {
  queryCache.clear(); // Invalidate cache
  Log('backend', 'info', 'service', `Marking notification read id: ${id}`);
  const notif = await repository.findById(id);
  if (!notif) {
    const err = new Error('Notification not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return repository.update(id, { isRead: true });
}

export function notifyAll(studentIds, data) {
  Log('backend', 'info', 'service', `Pushing ${studentIds.length} notification jobs to queue`);
  studentIds.forEach(studentId => {
    queueService.pushJob({ studentId, type: data.type, message: data.message });
  });
}
