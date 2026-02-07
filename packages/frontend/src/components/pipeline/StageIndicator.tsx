interface StageIndicatorProps {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-200 text-gray-500",
  running: "bg-blue-100 text-blue-700 animate-pulse",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-yellow-100 text-yellow-700",
};

export function StageIndicator({ name, status }: StageIndicatorProps): React.JSX.Element {
  return (
    <div className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}>
      {name}: {status}
    </div>
  );
}
