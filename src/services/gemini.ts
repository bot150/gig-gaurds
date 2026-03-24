import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'mock_key' });

export async function calculateRiskScore(location: string, weatherData: any) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Analyze the risk for a delivery worker in ${location} based on the following data:
        Weather: ${JSON.stringify(weatherData)}
        
        Provide a risk score from 0 to 100 and a suggested weekly premium in INR (30, 50, or 70).
        Return the result as a JSON object with keys: "score" (number), "premium" (number), and "reasoning" (string).
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.warn("Failed to generate AI response, using fallback:", e);
    // Fallback logic so onboarding is never blocked
    return { score: 45, premium: 50, reasoning: "Default risk assessment assigned." };
  }
}

export async function getRiskInsights(riskScore: number, category: string) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      As a risk analyst for ErgoShield, explain why a ${category} delivery worker has a risk score of ${riskScore}/100.
      Provide 3 actionable safety tips for this worker.
      Return the result as a JSON object with keys: "explanation" (string) and "tips" (array of strings).
    `,
    config: {
      responseMimeType: "application/json"
    }
  });

  const response = await model;
  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { 
      explanation: "Your risk score is calculated based on historical disruption data and your delivery category.",
      tips: ["Stay alert during peak hours", "Check weather updates regularly", "Maintain your vehicle"]
    };
  }
}
