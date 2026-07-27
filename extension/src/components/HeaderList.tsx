import type { SecurityHeader } from "@shared/types";

interface HeaderListProps {
  headers: SecurityHeader[];
}

export function HeaderList({ headers }: HeaderListProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-3">
        {headers.filter((h) => h.present).length} of {headers.length} security headers detected
      </p>
      {headers.map((header) => (
        <div
          key={header.name}
          className={`border rounded-lg p-3 ${
            header.present
              ? "bg-green-950/30 border-green-900"
              : header.severity === "high" || header.severity === "critical"
              ? "bg-red-950/30 border-red-900"
              : "bg-yellow-950/30 border-yellow-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {header.present ? (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
              <span className="text-sm font-mono font-medium">{header.name}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              header.severity === "critical" ? "bg-red-900 text-red-300" :
              header.severity === "high" ? "bg-red-900/60 text-red-300" :
              header.severity === "medium" ? "bg-yellow-900/60 text-yellow-300" :
              "bg-gray-800 text-gray-400"
            }`}>
              {header.severity}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{header.description}</p>
          {!header.present && (
            <p className="text-xs text-orange-400 mt-1">💡 {header.recommendation}</p>
          )}
          {header.present && header.value && (
            <p className="text-xs text-gray-500 mt-1 font-mono truncate">{header.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}
