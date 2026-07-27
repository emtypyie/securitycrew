import type { Grade } from "@shared/types";

interface ScoreGaugeProps {
  score: number;
  grade: Grade;
}

export function ScoreGauge({ score, grade }: ScoreGaugeProps) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 30 ? "#f97316" : "#ef4444";
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#1f2937"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400 font-medium">{grade}</span>
      </div>
    </div>
  );
}
