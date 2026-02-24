import express from "express";
import { resolveConfig } from "./config";
import { createSessionParserRouter } from "./router";

const config = resolveConfig();
const app = express();

app.use(express.json());
app.use("/api", createSessionParserRouter({ config }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`Session parser started on port ${config.port}`);
});
