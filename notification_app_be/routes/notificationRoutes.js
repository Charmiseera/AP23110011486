import express from 'express';
import { getNotifications, createNotification, readNotification, notifyAll } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', getNotifications);
router.post('/', createNotification);
router.post('/read', readNotification);
router.post('/notify-all', notifyAll);

export default router;
