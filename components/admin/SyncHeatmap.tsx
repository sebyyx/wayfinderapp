// Calendar heatmap of daily syncs (GitHub-contributions style). Pure render from
// the per-day counts produced by getUserDetail — no client JS.
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export function SyncHeatmap({ activity }: { activity: { date: string; count: number }[] }) {
  if (activity.length === 0) {
    return <p className="font-sans text-sm text-ink3">No sync data.</p>;
  }

  // Pad the front so the first column starts on a Sunday → clean week columns.
  const firstDow = new Date(`${activity[0].date}T00:00:00Z`).getUTCDay();
  const cells: ({ date: string; count: number } | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...activity,
  ];

  const weeks: ({ date: string; count: number } | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const max = Math.max(1, ...activity.map((a) => a.count));
  const total = activity.reduce((s, a) => s + a.count, 0);
  const activeDays = activity.filter((a) => a.count > 0).length;

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) =>
              cell ? (
                <div
                  key={cell.date}
                  title={`${dayFmt.format(new Date(`${cell.date}T00:00:00Z`))} · ${cell.count} sync${cell.count === 1 ? '' : 's'}`}
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: shade(cell.count, max) }}
                />
              ) : (
                <div key={`pad-${wi}-${di}`} className="h-3 w-3" />
              ),
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 font-sans text-xs text-ink4">
        {activeDays} active days · {total} syncs in the last {activity.length} days
      </p>
    </div>
  );
}

// Empty days read as faint surface; active days ramp toward the accent2 hue.
function shade(count: number, max: number): string {
  if (count <= 0) return 'rgba(255,255,255,0.06)';
  const t = Math.min(1, count / max);
  const alpha = 0.3 + t * 0.6; // 0.3 → 0.9
  return `rgba(186,166,221,${alpha.toFixed(2)})`; // accent2-ish lavender
}
