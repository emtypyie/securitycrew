import type {
  SecurityHeader,
  TLSInfo,
  DomainInfo,
  ReputationInfo,
  FormAnalysis,
  ScoreBreakdown,
  SecurityScore,
  Grade,
  RiskLevel,
} from "../types";

const WEIGHTS = {
  https: 15,
  tls: 20,
  headers: 25,
  reputation: 15,
  domainAge: 5,
  phishing: 10,
  formSafety: 10,
};

export function calculateScore(
  https: boolean,
  headers: SecurityHeader[],
  tls: TLSInfo,
  domain: DomainInfo,
  reputation: ReputationInfo,
  forms: FormAnalysis
): SecurityScore {
  const breakdown: ScoreBreakdown = {
    https: scoreHTTPS(https),
    tls: scoreTLS(tls),
    headers: scoreHeaders(headers),
    reputation: scoreReputation(reputation),
    domainAge: scoreDomainAge(domain),
    phishing: scorePhishing(domain),
    formSafety: scoreForms(forms),
  };

  const total = Math.round(
    (breakdown.https * WEIGHTS.https +
      breakdown.tls * WEIGHTS.tls +
      breakdown.headers * WEIGHTS.headers +
      breakdown.reputation * WEIGHTS.reputation +
      breakdown.domainAge * WEIGHTS.domainAge +
      breakdown.phishing * WEIGHTS.phishing +
      breakdown.formSafety * WEIGHTS.formSafety) /
      100
  );

  const clamped = Math.max(0, Math.min(100, total));

  return {
    total: clamped,
    grade: toGrade(clamped),
    riskLevel: toRiskLevel(clamped),
    breakdown,
  };
}

function scoreHTTPS(https: boolean): number {
  return https ? 100 : 0;
}

function scoreTLS(tls: TLSInfo): number {
  if (!tls.valid) return 0;
  let score = 70;
  if (tls.protocol === "TLSv1.3") score += 30;
  else if (tls.protocol === "TLSv1.2") score += 20;
  else score -= 20;
  if (tls.weakCipher) score -= 30;
  if (tls.selfSigned) score -= 40;
  if (tls.mixedContent) score -= 20;
  if (tls.daysUntilExpiry !== undefined && tls.daysUntilExpiry < 30) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function scoreHeaders(headers: SecurityHeader[]): number {
  if (headers.length === 0) return 0;
  const present = headers.filter((h) => h.present).length;
  const weighted = headers.reduce((acc, h) => {
    const severityWeight =
      h.severity === "critical" ? 4 : h.severity === "high" ? 3 : h.severity === "medium" ? 2 : 1;
    if (h.present) return acc + severityWeight * 25;
    return acc;
  }, 0);
  const maxWeighted = headers.reduce((acc, h) => {
    const severityWeight =
      h.severity === "critical" ? 4 : h.severity === "high" ? 3 : h.severity === "medium" ? 2 : 1;
    return acc + severityWeight * 25;
  }, 0);
  return Math.round((weighted / maxWeighted) * 100);
}

function scoreReputation(reputation: ReputationInfo): number {
  switch (reputation.status) {
    case "safe":
      return 100;
    case "unknown":
      return 50;
    case "suspicious":
      return 20;
    case "malicious":
      return 0;
  }
}

function scoreDomainAge(domain: DomainInfo): number {
  if (domain.ageDays === undefined) return 50;
  if (domain.ageDays > 365 * 5) return 100;
  if (domain.ageDays > 365) return 80;
  if (domain.ageDays > 90) return 60;
  if (domain.ageDays > 30) return 30;
  return 10;
}

function scorePhishing(domain: DomainInfo): number {
  let score = 100;
  if (domain.suspiciousTLD) score -= 25;
  if (domain.typosquatting) score -= 30;
  if (domain.homographAttack) score -= 35;
  if (domain.ipBasedURL) score -= 30;
  if (domain.excessiveSubdomains) score -= 15;
  if (domain.urlShortener) score -= 10;
  return Math.max(0, score);
}

function scoreForms(forms: FormAnalysis): number {
  if (!forms.hasPasswordFields && !forms.hasCreditCardFields) return 100;
  if (forms.isHTTP) return 0;
  if (forms.warning) return 30;
  return 80;
}

function toGrade(score: number): Grade {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

function toRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "safe";
  if (score >= 60) return "moderate";
  if (score >= 30) return "suspicious";
  return "dangerous";
}
