import * as notificationService from '../services/notificationService.js';
import { Log } from '../../logging_middleware/index.js';

export async function getNotifications(req, res, next) {
  try {
    const filters = req.query;
    Log('backend', 'info', 'controller', 'Fetching notifications');
    const result = await notificationService.getFilteredNotifications(filters);
    res.json(result);
  } catch (error) {
    Log('backend', 'error', 'controller', `Error fetching notifications: ${error.message}`);
    error.code = error.code || 'INTERNAL_ERROR';
    next(error);
  }
}

export async function createNotification(req, res, next) {
  try {
    const { studentId, type, message } = req.body;
    
    if (!studentId || !type || !message) {
      const err = new Error('Missing required fields: studentId, type, message');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }
    
    const validTypes = ['placement', 'result', 'event'];
    if (!validTypes.includes(type)) {
      const err = new Error('Invalid type. Must be placement, result, or event');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    const newNotification = await notificationService.createNotification({ studentId, type, message });
    res.status(201).json(newNotification);
  } catch (error) {
    Log('backend', 'error', 'controller', `Error creating notification: ${error.message}`);
    error.code = error.code || 'INTERNAL_ERROR';
    next(error);
  }
}

export async function readNotification(req, res, next) {
  try {
    const { id } = req.body;
    if (!id) {
      const err = new Error('Notification ID is required in body');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }
    
    const updatedNotification = await notificationService.markAsRead(id);
    res.json(updatedNotification);
  } catch (error) {
    Log('backend', 'error', 'controller', `Error marking notification as read: ${error.message}`);
    error.code = error.code || 'INTERNAL_ERROR';
    next(error);
  }
}

export async function notifyAll(req, res, next) {
  try {
    const { studentIds, type, message } = req.body;
    
    if (!Array.isArray(studentIds) || studentIds.length === 0 || !type || !message) {
      const err = new Error('Invalid input: requires array of studentIds, type, and message');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }
    
    const validTypes = ['placement', 'result', 'event'];
    if (!validTypes.includes(type)) {
      const err = new Error('Invalid type. Must be placement, result, or event');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    notificationService.notifyAll(studentIds, { type, message });
    
    res.status(202).json({ message: 'Notifications queued for asynchronous processing' });
  } catch (error) {
    Log('backend', 'error', 'controller', `Error in notifyAll: ${error.message}`);
    error.code = error.code || 'INTERNAL_ERROR';
    next(error);
  }
}
