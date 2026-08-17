import { ai } from "../config/gemini.js";
import { askGemini } from "./gemini.controller.js";

/*
|--------------------------------------------------------------------------
| SPEECH TO TEXT
|--------------------------------------------------------------------------
|
| Receives an audio file from Thunder Client.
|
| Then:
|
| Audio
|   ↓
| Gemini transcription
|   ↓
| Text
|   ↓
| Existing askGemini()
|
|--------------------------------------------------------------------------
*/

export const speechSearch = async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | CHECK AUDIO
    |--------------------------------------------------------------------------
    */

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Audio file is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | AUDIO INFORMATION
    |--------------------------------------------------------------------------
    */

    const audioBuffer = req.file.buffer;

    const mimeType =
      req.file.mimetype || "audio/wav";

    console.log(
      "=========================================="
    );

    console.log(
      "🎤 SPEECH SEARCH"
    );

    console.log(
      "Audio file:",
      req.file.originalname
    );

    console.log(
      "MIME type:",
      mimeType
    );

    console.log(
      "Audio size:",
      audioBuffer.length,
      "bytes"
    );

    console.log(
      "=========================================="
    );

    /*
    |--------------------------------------------------------------------------
    | LIMIT INLINE AUDIO
    |--------------------------------------------------------------------------
    |
    | Gemini inline audio requests have a 20 MB total request limit.
    |
    |--------------------------------------------------------------------------
    */

    const MAX_AUDIO_SIZE =
      20 * 1024 * 1024;

    if (
      audioBuffer.length >
      MAX_AUDIO_SIZE
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Audio file is too large. Please send an audio file smaller than 20 MB.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | BASE64 AUDIO
    |--------------------------------------------------------------------------
    */

    const base64Audio =
      audioBuffer.toString(
        "base64"
      );

    /*
    |--------------------------------------------------------------------------
    | TRANSCRIBE AUDIO
    |--------------------------------------------------------------------------
    |
    | We are NOT asking Gemini to find schemes here.
    |
    | Its only job is:
    |
    | AUDIO → TEXT
    |
    |--------------------------------------------------------------------------
    */

    const transcriptionPrompt = `
Transcribe the user's speech exactly as a short search query.

This is a government scheme search application.

Rules:

1. Return ONLY the transcription.
2. Do not explain anything.
3. Do not answer the question.
4. Do not add information.
5. Preserve scheme names.
6. Preserve names such as PM KISAN, PMAY, Ayushman Bharat, Mudra, etc.
7. The user may speak English, Hindi, Marathi, or Hinglish.
8. Do not translate the query.
9. Do not summarize the query.

Examples:

Audio:
"show me nutrition schemes"

Output:
show me nutrition schemes

Audio:
"PM Kisan"

Output:
PM Kisan

Audio:
"ladki bahin yojana"

Output:
ladki bahin yojana

Audio:
"mujhe Maharashtra mein women ke liye schemes batao"

Output:
mujhe Maharashtra mein women ke liye schemes batao
`;

    /*
    |--------------------------------------------------------------------------
    | GEMINI AUDIO TRANSCRIPTION
    |--------------------------------------------------------------------------
    */

    const transcriptionResponse =
      await ai.models.generateContent({
        model:
          "gemini-3.5-flash-lite",

        contents: [
          {
            role: "user",

            parts: [
              {
                text:
                  transcriptionPrompt,
              },

              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],

        config: {
          temperature: 0,
          maxOutputTokens: 200,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | GET TRANSCRIPT
    |--------------------------------------------------------------------------
    */

    const transcript =
      transcriptionResponse.text
        ?.trim();

    /*
    |--------------------------------------------------------------------------
    | TRANSCRIPTION FAILED
    |--------------------------------------------------------------------------
    */

    if (!transcript) {
      return res.status(422).json({
        success: false,
        error:
          "Could not understand the audio. Please try again.",
      });
    }

    console.log(
      "📝 Transcript:",
      transcript
    );

    /*
    |--------------------------------------------------------------------------
    | HISTORY
    |--------------------------------------------------------------------------
    |
    | Multipart form values arrive as strings.
    |
    |--------------------------------------------------------------------------
    */

    let history = [];

    if (req.body?.history) {
      try {
        history =
          JSON.parse(
            req.body.history
          );

        if (
          !Array.isArray(history)
        ) {
          history = [];
        }
      } catch (error) {
        history = [];
      }
    }

    /*
    |--------------------------------------------------------------------------
    | SEND TRANSCRIPT TO EXISTING TEXT PIPELINE
    |--------------------------------------------------------------------------
    |
    | THIS IS THE IMPORTANT PART.
    |
    | We do NOT create another database matcher.
    |
    | We simply call the SAME askGemini controller.
    |
    |--------------------------------------------------------------------------
    */

    req.body = {
      message: transcript,
      history,
    };

    /*
    |--------------------------------------------------------------------------
    | EXISTING TEXT SEARCH
    |--------------------------------------------------------------------------
    |
    | This will now do:
    |
    | transcript
    |     ↓
    | data1.json
    |     ↓
    | match → dataset
    |     ↓
    | no match → Gemini
    |     ↓
    | unrelated → reject
    |
    |--------------------------------------------------------------------------
    */

    return askGemini(
      req,
      res
    );

  } catch (error) {
    console.error(
      "Speech Search Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to process your speech right now",
    });
  }
};