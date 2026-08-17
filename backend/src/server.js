import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import geminiRoutes from "./routes/gemini.routes.js";
import schemeRoutes from "./routes/scheme.routes.js";

const PORT = process.env.PORT || 5000;

const app = express();

/*
|--------------------------------------------------------------------------
| PATHS
|--------------------------------------------------------------------------
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(
  __dirname,
  "../../frontend/dist"
);

/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(cors());

app.use(helmet());

app.use(morgan("combined"));

app.use(express.json());

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.sendFile(
    path.join(frontendPath, "index.html")
  );
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy!",
  });
});

/*
|--------------------------------------------------------------------------
| GEMINI / AI
|--------------------------------------------------------------------------
*/

app.use(
  "/api/gemini",
  geminiRoutes
);

/*
|--------------------------------------------------------------------------
| SCHEMES / SEARCH / PROFILES
|--------------------------------------------------------------------------
*/

app.use(
  "/api",
  schemeRoutes
);

/*
|--------------------------------------------------------------------------
| SERVE FRONTEND BUILD
|--------------------------------------------------------------------------
*/

app.use(
  express.static(frontendPath)
);

/*
|--------------------------------------------------------------------------
| FRONTEND SPA FALLBACK
|--------------------------------------------------------------------------
*/

app.get(
  "/{*splat}",
  (req, res) => {
    res.sendFile(
      path.join(frontendPath, "index.html")
    );
  }
);

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  () => {
    console.log(
      `Listening on port ${PORT}`
    );
  }
);