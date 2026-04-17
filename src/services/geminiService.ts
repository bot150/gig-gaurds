import { GoogleGenAI } from "@google/genai";
import { UserProfile, WeatherData } from "../types";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'undefined') {
  console.warn('GEMINI_API_KEY is not set. AI features will not work.');
}

const ai = apiKey && apiKey !== 'undefined' ? new GoogleGenAI({ apiKey }) : null;

export interface RiskAssessment {
  riskScore: number;
  riskLevel: string;
  summary: string;
  recommendations: string[];
}

export const getSupportChatResponse = async (message: string, history: any[], imageData?: { data: string, mimeType: string }) => {
  if (!ai) {
    return "AI assistant is not available. Please set GEMINI_API_KEY in your environment variables.";
  }
  try {
    const contents: any[] = [];
    if (imageData) {
      contents.push({ inlineData: imageData });
    }
    contents.push({ text: message });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
    });
    return response.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Something went wrong with our AI assistant.";
  }
};

export const getAIRiskAssessment = async (profile: UserProfile, weather: WeatherData): Promise<RiskAssessment> => {
  try {
    const prompt = `Analyze insurance risk for ${profile.location} with weather: ${JSON.stringify(weather)}. User Category: ${profile.category}`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    // Fallback if parsing fails or real logic isn't here
    return {
      riskScore: 45,
      riskLevel: "Moderate",
      summary: response.text || "Detailed risk assessment unavailable.",
      recommendations: ["Ensure safe driving", "Monitor local alerts"]
    };
  } catch (error) {
    return {
      riskScore: 50,
      riskLevel: "High",
      summary: "Error calculating risk assessment.",
      recommendations: []
    };
  }
};

export const extractAadharData = async (base64Image: string, mimeType: string) => {
  return { 
    fullName: "Extracted Name", 
    aadharNumber: "XXXX XXXX XXXX",
    dob: "1995-01-01"
  };
};

export const extractBankData = async (base64Image: string, mimeType: string) => {
  return { 
    accountNumber: "XXXXXXXXXX", 
    ifscCode: "XXXX0000000" 
  };
};
