
import { GoogleGenAI } from "@google/genai";

/**
 * Defines a word using Gemini API
 * Following guidelines: Instantiates GoogleGenAI inside the function to ensure the latest API key is used.
 */
export async function defineWord(word: string) {
  if (!word || word.length < 2) return null;
  
  // Always create a new instance right before making an API call to ensure it uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Define the word "${word}" in the context of Scrabble using Merriam Dictionary. Keep it brief (max 30 words). Output VALID or INVALID followed by the definition.`,
      config: {
        temperature: 0.5,
        // When setting maxOutputTokens, thinkingBudget must also be set.
        // The remaining tokens (maxOutputTokens - thinkingBudget) are used for the final response.
        maxOutputTokens: 200,
        thinkingConfig: { thinkingBudget: 100 },
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}
