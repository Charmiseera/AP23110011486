import { fetchDepots, fetchVehicles } from '../repositories/vehicle_repository.js';
import { Log } from '../../logging_middleware/index.js';

/**
 * Optimized 1D 0/1 Knapsack algorithm
 * Time Complexity: O(n * W) where n is the number of tasks and W is the capacity (mechanicHours).
 * Space Complexity: O(n * W) for the `keep` array to reconstruct the selected items, and O(W) for `dp` array.
 * Note on Large Inputs: For very large W (capacity), the memory footprint of the `keep` array can grow large. 
 * If W is extremely large, memory could become a bottleneck and an alternative approach (e.g. branch and bound) might be required.
 * @param {number} capacity - Mechanic hours available
 * @param {Array} items - Tasks array {id, duration, impact}
 * @returns {Object} - Selected tasks, total duration, and total impact
 */
function knapsack1D(capacity, items) {
  // Edge Case: If no capacity or items, return empty results safely.
  if (!capacity || !items || items.length === 0) {
    return { selectedTasks: [], totalDuration: 0, totalImpact: 0 };
  }

  const dp = Array(capacity + 1).fill(0);
  const keep = Array(items.length).fill().map(() => Array(capacity + 1).fill(false));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Safety check for empty or malformed task data
    if (!item || typeof item.duration !== 'number' || typeof item.impact !== 'number' || item.duration <= 0) {
      Log('backend', 'warn', 'service', `Skipping malformed task: ${JSON.stringify(item)}`);
      continue;
    }

    for (let w = capacity; w >= item.duration; w--) {
      if (dp[w - item.duration] + item.impact > dp[w]) {
        dp[w] = dp[w - item.duration] + item.impact;
        keep[i][w] = true;
      }
    }
  }

  // Backtracking to find selected items
  let w = capacity;
  const selectedTasks = [];
  let totalDuration = 0;

  for (let i = items.length - 1; i >= 0; i--) {
    if (keep[i][w]) {
      const item = items[i];
      selectedTasks.push(item);
      totalDuration += item.duration;
      w -= item.duration;
    }
  }

  return {
    selectedTasks,
    totalDuration,
    totalImpact: dp[capacity]
  };
}

export async function generateSchedule(depotId) {
  Log('backend', 'info', 'service', `Generating schedule for depot: ${depotId}`);
  
  const depots = await fetchDepots();
  const depot = depots.find(d => String(d.id) === String(depotId) || String(d.ID) === String(depotId));
  
  if (!depot) {
    const err = new Error(`Depot with ID ${depotId} not found or is invalid`);
    err.status = 400; // Replaced 404 with 400 for invalid depot requirement
    throw err;
  }
  
  const mechanicHours = depot.MechanicHours || depot.mechanicHours;

  // Ensure mechanicHours exists and is valid
  if (typeof mechanicHours !== 'number' || mechanicHours <= 0) {
    Log('backend', 'warn', 'service', `Depot ${depotId} has invalid mechanicHours: ${mechanicHours}`);
    return {
      selectedTasks: [],
      totalDuration: 0,
      totalImpact: 0
    };
  }

  const tasksData = await fetchVehicles();
  
  const allTasks = [];
  if (Array.isArray(tasksData)) {
    tasksData.forEach(task => {
      // Map properties from the actual API payload (TaskID, Duration, Impact)
      allTasks.push({
        id: task.TaskID || task.id,
        duration: task.Duration || task.duration,
        impact: task.Impact || task.impact
      });
    });
  } else {
    Log('backend', 'warn', 'service', `Vehicles/Tasks list is invalid or missing`);
  }

  Log('backend', 'info', 'service', `Found ${allTasks.length} tasks. Running optimized knapsack.`);
  
  const result = knapsack1D(mechanicHours, allTasks);
  
  Log('backend', 'info', 'service', 'Optimization completed successfully');
  
  const efficiency = result.totalDuration > 0 ? Number((result.totalImpact / result.totalDuration).toFixed(2)) : 0;

  return {
    selectedTasks: result.selectedTasks,
    totalDuration: result.totalDuration,
    totalImpact: result.totalImpact
  };
}
