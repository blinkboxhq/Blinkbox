import express from "express";
import automationRoutes from "../modules/automation/automation.routes.js";
import executionRoutes from "../modules/execution/execution.routes.js";

const app = express();

app.use(express.json());

// API routes
app.use("/api/automations", automationRoutes);
app.use("/api/executions", executionRoutes);

// Health check
app.get("/health", (_, res) => res.json({ status: "ok" }));

export default app;
