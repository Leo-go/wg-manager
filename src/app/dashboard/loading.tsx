export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-8 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-10 w-72 rounded bg-muted" />
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="h-5 w-full rounded bg-muted" />
        <div className="h-5 w-full max-w-xl rounded bg-muted" />
        <div className="h-5 w-full max-w-lg rounded bg-muted" />
        <div className="h-5 w-full max-w-md rounded bg-muted" />
      </div>
    </div>
  );
}
