
export type AnalysisType = 'BODY_POSE' | 'MEDICAL_REPORT' | 'MEDICINE' | 'GENERAL_CHAT';

export interface HealthMetric {
  label: string;
  value: string | number;
  status: 'normal' | 'warning' | 'critical' | 'neutral';
  description?: string;
}

export type PostureIssue =
  | 'forward_head'
  | 'rounded_shoulders'
  | 'kyphosis'
  | 'anterior_pelvic_tilt'
  | 'posterior_pelvic_tilt'
  | 'lordosis'
  | 'flat_back'
  | 'uneven_shoulders'
  | 'lateral_pelvic_tilt'
  | 'knee_valgus';

export interface PostureFinding {
  issue: PostureIssue;
  severity: 'mild' | 'moderate' | 'severe';
  side?: 'left' | 'right' | 'none';
  note?: string;
}

export interface AnalysisResult {
  /** Structured posture deviations (BODY_POSE only), drives the 3D mannequin. */
  posture?: PostureFinding[];
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
