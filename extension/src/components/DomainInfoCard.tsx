import type { DomainInfo, ReputationInfo, TLSInfo } from "@shared/types";

interface DomainInfoCardProps {
  domain: DomainInfo;
  reputation: ReputationInfo;
  tls: TLSInfo;
}

export function DomainInfoCard({ domain, reputation, tls }: DomainInfoCardProps) {
  return (
    <div className="space-y-3">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Domain</p>
        <p className="text-sm font-mono font-medium">{domain.domain}</p>
        {domain.ageDays !== undefined && (
          <p className="text-xs text-gray-400 mt-1">
            Age: {domain.ageDays > 365 ? `${Math.floor(domain.ageDays / 365)} years` : `${domain.ageDays} days`}
          </p>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-2">TLS Certificate</p>
        <div className="space-y-1">
          <InfoRow label="Valid" value={tls.valid ? "Yes" : "No"} good={tls.valid} />
          {tls.issuer && <InfoRow label="Issuer" value={tls.issuer} />}
          {tls.protocol && <InfoRow label="Protocol" value={tls.protocol} />}
          {tls.daysUntilExpiry !== undefined && (
            <InfoRow label="Expires in" value={`${tls.daysUntilExpiry} days`} good={tls.daysUntilExpiry > 30} />
          )}
          {tls.selfSigned && <InfoRow label="Warning" value="Self-signed certificate" good={false} />}
          {tls.weakCipher && <InfoRow label="Warning" value="Weak cipher detected" good={false} />}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-2">Phishing Indicators</p>
        <div className="space-y-1">
          <IndicatorRow label="Suspicious TLD" detected={domain.suspiciousTLD} />
          <IndicatorRow label="Typosquatting" detected={domain.typosquatting} />
          <IndicatorRow label="Homograph Attack" detected={domain.homographAttack} />
          <IndicatorRow label="IP-based URL" detected={domain.ipBasedURL} />
          <IndicatorRow label="Excessive Subdomains" detected={domain.excessiveSubdomains} />
          <IndicatorRow label="URL Shortener" detected={domain.urlShortener} />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-2">Reputation</p>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            reputation.status === "safe" ? "bg-green-500" :
            reputation.status === "suspicious" ? "bg-yellow-500" :
            reputation.status === "malicious" ? "bg-red-500" :
            "bg-gray-500"
          }`} />
          <span className="text-sm font-medium capitalize">{reputation.status}</span>
        </div>
        {reputation.sources.map((source) => (
          <div key={source.name} className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{source.name}</span>
            <span className={`capitalize ${
              source.status === "safe" ? "text-green-400" :
              source.status === "suspicious" ? "text-yellow-400" :
              source.status === "malicious" ? "text-red-400" :
              "text-gray-400"
            }`}>{source.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={good === undefined ? "text-gray-300" : good ? "text-green-400" : "text-red-400"}>
        {value}
      </span>
    </div>
  );
}

function IndicatorRow({ label, detected }: { label: string; detected: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      {detected ? (
        <span className="text-red-400 font-medium">⚠ Detected</span>
      ) : (
        <span className="text-green-400">✓ Clean</span>
      )}
    </div>
  );
}
