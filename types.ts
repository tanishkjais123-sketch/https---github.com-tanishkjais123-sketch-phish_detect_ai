
export enum RiskLevel {
  SAFE = 'SAFE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  content: string;
  type: 'URL' | 'EMAIL' | 'SMS' | 'VOICE';
  isPhishing: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  category: string;
  suspiciousElements: string[];
  explanation: string;
  technicalDetails: string;
  safetyAdvice: string;
}

export interface AppState {
  history: AnalysisResult[];
  isScanning: boolean;
  currentResult: AnalysisResult | null;
  isVishingLabActive: boolean;
}
