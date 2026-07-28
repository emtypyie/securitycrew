export type Severity = "low" | "medium" | "high" | "critical";

export type RiskLevel = "safe" | "moderate" | "suspicious" | "dangerous";

export type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface SecurityHeader {
  name: string;
  present: boolean;
  value?: string;
  severity: Severity;
  recommendation: string;
  description: string;
}

export interface TLSInfo {
  valid: boolean;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  protocol?: string;
  weakCipher?: boolean;
  selfSigned?: boolean;
  mixedContent?: boolean;
}

export interface DomainInfo {
  domain: string;
  ageDays?: number;
  registrar?: string;
  creationDate?: string;
  suspiciousTLD: boolean;
  typosquatting: boolean;
  homographAttack: boolean;
  ipBasedURL: boolean;
  excessiveSubdomains: boolean;
  urlShortener: boolean;
  suspiciousScore: number;
}

export interface ReputationInfo {
  status: "safe" | "suspicious" | "malicious" | "unknown";
  sources: ReputationSource[];
}

export interface ReputationSource {
  name: string;
  status: "safe" | "suspicious" | "malicious" | "unknown";
  url?: string;
}

export interface FormAnalysis {
  hasPasswordFields: boolean;
  hasCreditCardFields: boolean;
  hasLoginForm: boolean;
  isHTTP: boolean;
  formCount: number;
  warning: string | null;
}

export interface SecurityReport {
  url: string;
  timestamp: number;
  https: boolean;
  headers: SecurityHeader[];
  tls: TLSInfo;
  domain: DomainInfo;
  reputation: ReputationInfo;
  forms: FormAnalysis;
  score: SecurityScore;
  aiSummary?: string;
}

export interface SecurityScore {
  total: number;
  grade: Grade;
  riskLevel: RiskLevel;
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  https: number;
  tls: number;
  headers: number;
  reputation: number;
  domainAge: number;
  phishing: number;
  formSafety: number;
}

export interface AIExplanation {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface HistoryEntry {
  url: string;
  score: number;
  riskLevel: RiskLevel;
  timestamp: number;
  favicon?: string;
}

export type AIProvider = "llamacpp" | "gemini" | "openai";

export interface ExtensionSettings {
  enableNotifications: boolean;
  enableFormGuard: boolean;
  educationalMode: boolean;
  backendUrl: string;
  aiProvider: AIProvider;
  aiServerUrl: string;
  aiModel: string;
  aiApiKey: string;
}
