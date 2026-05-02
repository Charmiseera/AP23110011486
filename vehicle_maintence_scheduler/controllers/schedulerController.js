import * as schedulerService from '../services/schedulerService.js';
import { Log } from '../../logging_middleware/index.js';

export async function getSchedule(req, res, next) {
  try {
    const { depotId } = req.params;
    
    // Input Validation
    if (!depotId || depotId.trim() === '') {
      const err = new Error('depotId parameter is required and cannot be empty');
      err.status = 400;
      throw err;
    }

    Log('backend', 'info', 'controller', `Received request for depotId: ${depotId}`);
    
    const schedule = await schedulerService.generateSchedule(depotId);
    
    res.json(schedule);
  } catch (error) {
    Log('backend', 'error', 'controller', `Error in getSchedule: ${error.message}`);
    next(error);
  }
}
