"use client";

function formatVnd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₫`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ₫`;
  return `${value.toLocaleString()} ₫`;
}

export default function ConversionGauge({ rate, won, pipeline }: { rate: number; won: number; pipeline: number }) {
  const angle = (rate / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const x = 100 + 70 * Math.cos(Math.PI - rad);
  const y = 100 - 70 * Math.sin(Math.PI - rad);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round" />
        <path
          d={`M 20 100 A 80 80 0 ${angle > 90 ? 1 : 0} 1 ${x} ${y}`}
          fill="none"
          stroke={rate >= 50 ? "#22c55e" : rate >= 25 ? "#f59e0b" : "#ef4444"}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold" fontSize="28" fill="#111827">
          {rate}%
        </text>
        <text x="100" y="115" textAnchor="middle" fontSize="11" fill="#6b7280">
          Conversion
        </text>
      </svg>
      <div className="flex gap-6 text-center text-sm">
        <div>
          <div className="font-semibold text-purple-600">{formatVnd(won)}</div>
          <div className="text-xs text-gray-500">Won Value</div>
        </div>
        <div>
          <div className="font-semibold text-blue-600">{formatVnd(pipeline)}</div>
          <div className="text-xs text-gray-500">Pipeline</div>
        </div>
      </div>
    </div>
  );
}
