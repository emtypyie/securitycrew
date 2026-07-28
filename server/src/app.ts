import express from "express";
import cors from "cors";
import { tlsRouter } from "./routes/tls.js";
import { whoisRouter } from "./routes/whois.js";
import { reputationRouter } from "./routes/reputation.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/tls", tlsRouter);
app.use("/api/whois", whoisRouter);
app.use("/api/reputation", reputationRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`SecurityCrew server running on http://localhost:${PORT}`);
});
