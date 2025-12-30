
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function defineWord(word: string) {
  if (!word || word.length < 2) return null;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Define the word "${word}" in the context of Scrabble using Merriam Dictionary. Keep it brief (max 30 words). Output VALID or INVALID followed by the definition.`,
      config: {
        temperature: 0.5,
        maxOutputTokens: 100,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}
