
export type AnalysisType = 'BODY_POSE' | 'MEDICAL_REPORT' | 'MEDICINE' | 'GENERAL_CHAT';

export interface HealthMetric {
  label: string;
  value: string | number;
  status: 'normal' | 'warning' | 'critical' | 'neutral';
  description?: string;
}

export interface AnalysisResult {
  id: string;
  type: AnalysisType;
  timestamp: Date;
  summary: string;
  metrics: HealthMetric[];
  recommendations: string[];
  disclaimer: string;
  rawOutput?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

export interface UserHealthState {
  analysisHistory: AnalysisResult[];
  chatHistory: ChatMessage[];
  currentProfile: {
    name: string;
    recentConditions: string[];
    fitnessGoals: string[];
  };
}
