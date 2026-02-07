import { initSchema, closeDriver } from "./db/neo4j.js";
import { createApp } from "./server.js";

const PORT = parseInt(process.env["PORT"] ?? "4000", 10);

async function main(): Promise<void> {
  console.log("Initializing Neo4j schema...");
  await initSchema();
  console.log("Neo4j schema initialized.");

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log("Shutting down...");
    server.close();
    await closeDriver();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
