import { Log } from '../../logging_middleware/index.js';
import * as notificationRepository from '../repositories/notificationRepository.js';

const queue = [];
let isProcessing = false;

export function pushJob(job) {
  queue.push({ ...job, retries: 0 });
  processQueue();
}

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    try {
      Log('backend', 'info', 'service', `Processing notification job for studentId: ${job.studentId}`);
      
      // Simulating async job processing delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await notificationRepository.createNotification(job);
      
      Log('backend', 'info', 'service', `Successfully processed notification job for studentId: ${job.studentId}`);
    } catch (error) {
      if (job.retries < 2) {
        job.retries++;
        Log('backend', 'warn', 'service', `Job failed, retrying (${job.retries}/2) for studentId: ${job.studentId}`);
        queue.push(job); // Push back to retry
      } else {
        Log('backend', 'error', 'service', `Job failed permanently after 2 retries for studentId: ${job.studentId}. Error: ${error.message}`);
      }
    }
  }
  
  isProcessing = false;
}
