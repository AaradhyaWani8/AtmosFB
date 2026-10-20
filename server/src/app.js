import cors from "cors";
import express from "express";
import helmet from "helmet";
import { handleError } from "./middleware.js";
import { router } from "./routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim()),
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);
app.use((request, response) => response.status(404).json({ error: "Endpoint not found." }));
app.use(handleError);
