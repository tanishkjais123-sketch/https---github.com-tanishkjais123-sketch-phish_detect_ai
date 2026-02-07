
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, RiskLevel } from "../types";

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isPhishing: { type: Type.BOOLEAN, description: "Whether the content is likely a phishing attempt" },
    riskScore: { type: Type.INTEGER, description: "Risk score from 0 to 100" },
    riskLevel: { 
      type: Type.STRING, 
      description: `Qualitative risk level. MUST be one of: ${Object.values(RiskLevel).join(', ')}` 
    },
    category: { type: Type.STRING, description: "Phishing category (e.g., Credential Harvesting, Social Engineering)" },
    suspiciousElements: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of specific suspicious markers found in the content"
    },
    explanation: { type: Type.STRING, description: "Detailed plain language explanation of the analysis" },
    technicalDetails: { type: Type.STRING, description: "Deep dive into technical signals or obfuscation techniques detected" },
    safetyAdvice: { type: Type.STRING, description: "Actionable advice for the user to stay safe" }
  },
  required: ["isPhishing", "riskScore", "riskLevel", "category", "suspiciousElements", "explanation", "technicalDetails", "safetyAdvice"]
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error?.message?.includes('429') || 
                        error?.message?.includes('503') || 
                        error?.message?.includes('limit');
    
    if (retries > 0 && isRetryable) {
      console.warn(`API Busy. Retrying in ${delay}ms... (${retries} attempts left)`);
      await sleep(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const analyzeContent = async (content: string, type: 'URL' | 'EMAIL' | 'SMS'): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Check your environment configuration.");
  }

  return retryWithBackoff(async () => {
    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-3-flash-preview for high-frequency scanning tasks to avoid rate limits
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a forensic security analysis on this ${type} for phishing markers. 
      Analyze linguistics, intent, and technical signals.
      
      CONTENT: ${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("The neural engine returned an empty response.");
    }

    const parsedData = JSON.parse(responseText.trim());
    
    const riskLevel = Object.values(RiskLevel).includes(parsedData.riskLevel as RiskLevel)
      ? (parsedData.riskLevel as RiskLevel)
      : RiskLevel.MEDIUM;

    return {
      ...parsedData,
      riskLevel,
      id: `PG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      timestamp: Date.now(),
      content,
      type
    };
  });
};
