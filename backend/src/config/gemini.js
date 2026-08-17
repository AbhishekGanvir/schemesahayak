import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}
export const ai = new GoogleGenAI({ apiKey });
