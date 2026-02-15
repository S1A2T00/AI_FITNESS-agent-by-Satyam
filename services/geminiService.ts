
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { MODEL_CONFIG, SYSTEM_INSTRUCTIONS } from "../constants";
import { AnalysisType, AnalysisResult, HealthMetric } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function performAnalysis(
  type: AnalysisType,
  images?: string | string[],
  text?: string
): Promise<AnalysisResult> {
  const imageList = Array.isArray(images) ? images : (images ? [images] : []);
  
  const imageParts = imageList.map(img => ({
    inlineData: { 
      mimeType: 'image/jpeg', 
      data: img.split(',')[1] 
    }
  }));

  const response = await ai.models.generateContent({
    model: MODEL_CONFIG.VISION_MODEL,
    contents: {
      parts: [
        { text: `${SYSTEM_INSTRUCTIONS.HEALTH_AGENT}\n\nTask: Perform a ${type} analysis. ${text || ""}` },
        ...imageParts
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          metrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['normal', 'warning', 'critical', 'neutral'] },
                description: { type: Type.STRING }
              },
              required: ['label', 'value', 'status']
            }
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          disclaimer: { type: Type.STRING }
        },
        required: ['summary', 'metrics', 'recommendations', 'disclaimer']
      }
    }
  });

  const data = JSON.parse(response.text);

  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    timestamp: new Date(),
    summary: data.summary,
    metrics: data.metrics,
    recommendations: data.recommendations,
    disclaimer: data.disclaimer,
    rawOutput: response.text
  };
}

export async function chatWithCoach(
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[],
  healthContext: string
) {
  const chat = ai.chats.create({
    model: MODEL_CONFIG.TEXT_MODEL,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTIONS.HEALTH_AGENT}\n\nUSER HEALTH CONTEXT:\n${healthContext}`,
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text;
}
