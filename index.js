import 'dotenv/config';
import express from 'express';
import { Log, loggingMiddleware } from './logging_middleware/index.js';
import schedulerRoutes from './vehicle_maintence_scheduler/routes/schedulerRoutes.js';
import notificationRoutes from './notification_app_be/routes/notificationRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(loggingMiddleware);

// Routes
app.use('/schedule', schedulerRoutes);
app.use('/notifications', notificationRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  Log('backend', 'error', 'handler', `Unhandled Error: ${err.message}`);
  
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  
  res.status(status).json({
    error: {
      code,
      message: err.message || 'Internal Server Error'
    }
  });
});

// Start Server
app.listen(PORT, () => {
  Log('backend', 'info', 'route', `Server is running on port ${PORT}`);
});
