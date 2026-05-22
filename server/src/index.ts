import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Furniture ERP API listening on port ${env.PORT}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("Received shutdown signal, closing gracefully...");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("Could not close connections in time, forcing shutdown");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Trigger restart
