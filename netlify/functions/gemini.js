import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    isPhishing: { type: SchemaType.BOOLEAN },
    riskScore: { type: SchemaType.INTEGER },
    riskLevel: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    suspiciousElements: { 
      type: SchemaType.ARRAY, 
      items: { type: SchemaType.STRING } 
    },
    explanation: { type: SchemaType.STRING },
    technicalDetails: { type: SchemaType.STRING },
    safetyAdvice: { type: SchemaType.STRING }
  },
  required: ["isPhishing", "riskScore", "riskLevel", "category", "suspiciousElements", "explanation", "technicalDetails", "safetyAdvice"]
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { content, type } = JSON.parse(event.body);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    });

    const prompt = `Perform a forensic security analysis on this ${type} for phishing markers. 
      Analyze linguistics, intent, and technical signals.
      CONTENT: ${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
      body: text,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to analyze content: " + error.message }),
    };
  }
};