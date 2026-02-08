import { AnalysisResult, RiskLevel } from "../types";

/**
 * UPDATED GEMINI SERVICE
 * This version uses a Netlify Function to hide the API key from the frontend,
 * resolving the "Secret scanning found secrets in build" error.
 */

export const analyzeContent = async (content: string, type: 'URL' | 'EMAIL' | 'SMS'): Promise<AnalysisResult> => {
  try {
    // 1. We call our internal Netlify function endpoint.
    // This path refers to the file located at netlify/functions/gemini.js
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        type
      }),
    });

    // 2. Error handling if the function fails
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "The analysis engine encountered an error.");
    }

    // 3. Get the JSON response from your function
    const parsedData = await response.json();

    // 4. Validate that the risk level returned matches your app's RiskLevel enum
    const riskLevel = Object.values(RiskLevel).includes(parsedData.riskLevel as RiskLevel)
      ? (parsedData.riskLevel as RiskLevel)
      : RiskLevel.MEDIUM;

    // 5. Construct and return the full AnalysisResult object
    return {
      ...parsedData,
      riskLevel,
      // Generate a unique ID for this specific scan
      id: `PG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      timestamp: Date.now(),
      content,
      type
    };
  } catch (error: any) {
    console.error("Analysis Service Error:", error);
    throw error;
  }
};