const WEIGHTS = { https: 15, tls: 20, headers: 25, reputation: 15, domainAge: 5, phishing: 10, formSafety: 10 };

export function calculateScore(https, headers, tls, domain, reputation, forms) {
  const breakdown = {
    https: scoreHTTPS(https),
    tls: scoreTLS(tls),
    headers: scoreHeaders(headers),
    reputation: scoreReputation(reputation),
    domainAge: scoreDomainAge(domain),
    phishing: scorePhishing(domain),
    formSafety: scoreForms(forms),
  };
  const total = Math.round(
    (breakdown.https * WEIGHTS.https + breakdown.tls * WEIGHTS.tls + breakdown.headers * WEIGHTS.headers +
      breakdown.reputation * WEIGHTS.reputation + breakdown.domainAge * WEIGHTS.domainAge +
      breakdown.phishing * WEIGHTS.phishing + breakdown.formSafety * WEIGHTS.formSafety) / 100
  );
  const clamped = Math.max(0, Math.min(100, total));
  return { total: clamped, grade: toGrade(clamped), riskLevel: toRiskLevel(clamped), breakdown };
}

function scoreHTTPS(https) { return https ? 100 : 0; }

function scoreTLS(tls) {
  if (!tls.valid) return 0;
  let s = 70;
  if (tls.protocol === "TLSv1.3") s += 30;
  else if (tls.protocol === "TLSv1.2") s += 20;
  else s -= 20;
  if (tls.weakCipher) s -= 30;
  if (tls.selfSigned) s -= 40;
  if (tls.mixedContent) s -= 20;
  if (tls.daysUntilExpiry !== undefined && tls.daysUntilExpiry < 30) s -= 15;
  return Math.max(0, Math.min(100, s));
}

function scoreHeaders(headers) {
  if (headers.length === 0) return 0;
  const weighted = headers.reduce((acc, h) => {
    const w = h.severity === "critical" ? 4 : h.severity === "high" ? 3 : h.severity === "medium" ? 2 : 1;
    return acc + (h.present ? w * 25 : 0);
  }, 0);
  const maxWeighted = headers.reduce((acc, h) => {
    const w = h.severity === "critical" ? 4 : h.severity === "high" ? 3 : h.severity === "medium" ? 2 : 1;
    return acc + w * 25;
  }, 0);
  return Math.round((weighted / maxWeighted) * 100);
}

function scoreReputation(reputation) {
  switch (reputation.status) {
    case "safe": return 100;
    case "unknown": return 50;
    case "suspicious": return 20;
    case "malicious": return 0;
    default: return 50;
  }
}

function scoreDomainAge(domain) {
  if (domain.ageDays === undefined) return 50;
  if (domain.ageDays > 365 * 5) return 100;
  if (domain.ageDays > 365) return 80;
  if (domain.ageDays > 90) return 60;
  if (domain.ageDays > 30) return 30;
  return 10;
}

function scorePhishing(domain) {
  let s = 100;
  if (domain.suspiciousTLD) s -= 25;
  if (domain.typosquatting) s -= 30;
  if (domain.homographAttack) s -= 35;
  if (domain.ipBasedURL) s -= 30;
  if (domain.excessiveSubdomains) s -= 15;
  if (domain.urlShortener) s -= 10;
  return Math.max(0, s);
}

function scoreForms(forms) {
  if (!forms.hasPasswordFields && !forms.hasCreditCardFields) return 100;
  if (forms.isHTTP) return 0;
  if (forms.warning) return 30;
  return 80;
}

function toGrade(score) {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

function toRiskLevel(score) {
  if (score >= 80) return "safe";
  if (score >= 60) return "moderate";
  if (score >= 30) return "suspicious";
  return "dangerous";
}
