import express from "express";
import multer from "multer";

import {
  askGemini,
} from "../controllers/gemini.controller.js";

import {
  speechSearch,
} from "../controllers/speech.controller.js";

import {
  translateResult,
  prepareSpeechText,
} from "../controllers/translate.controller.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| MULTER
|--------------------------------------------------------------------------
*/

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        20 * 1024 * 1024,
    },
  });

/*
|--------------------------------------------------------------------------
| TEXT SEARCH
|--------------------------------------------------------------------------
*/

router.post(
  "/ask",
  askGemini
);

/*
|--------------------------------------------------------------------------
| SPEECH SEARCH
|--------------------------------------------------------------------------
*/

router.post(
  "/speech-ask",

  upload.single("audio"),

  speechSearch
);

/*
|--------------------------------------------------------------------------
| TRANSLATE RESULT
|--------------------------------------------------------------------------
*/

router.post(
  "/translate",

  translateResult
);

/*
|--------------------------------------------------------------------------
| PREPARE TEXT FOR TTS
|--------------------------------------------------------------------------
*/

router.post(
  "/speech-text",

  prepareSpeechText
);

console.log(
  "✅ Gemini routes loaded"
);

console.log(
  "   POST /api/gemini/ask"
);

console.log(
  "   POST /api/gemini/speech-ask"
);

console.log(
  "   POST /api/gemini/translate"
);

console.log(
  "   POST /api/gemini/speech-text"
);

export default router;