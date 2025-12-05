import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateWelcomeMessage = async (name: string, count: number): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return `Welcome back, ${name}! Great job on trip #${count}.`;

  try {
    const prompt = `
      You are a friendly staff assistant at "Trunk & Soul Elephant Home".
      A shuttle driver named ${name} just completed their trip number ${count}.
      
      Generate a short, encouraging message (1-2 sentences) in Thai (with English translation in parentheses).
      Mention their progress towards the 10-trip reward if close.
      Optionally include a tiny fun fact about elephants.
      Keep it warm and professional.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Welcome back to Trunk & Soul!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Welcome back, ${name}! Trip #${count} recorded.`;
  }
};