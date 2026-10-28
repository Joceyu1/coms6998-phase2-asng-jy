export function ActivityChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const safePoints = points.map((point) => ({ ...point, value: Number.isFinite(point.value) ? Math.max(0, point.value) : 0 }));
  const maximum = Math.max(1, ...safePoints.map((point) => point.value));
  const total = safePoints.reduce((sum, point) => sum + point.value, 0);
  if (!safePoints.length) return <p className="chart-empty">Activity will appear when community ratings are recorded.</p>;
  return <figure className="activity-chart"><figcaption className="chart-caption"><span><span className="legend-dot" />Community ratings</span><strong>{total.toLocaleString()} total</strong></figcaption><div className="activity-bars" aria-label="Ratings by day">{safePoints.map((point, index) => <div className="activity-column" key={`${point.label}-${index}`}><span className="activity-value">{point.value}</span><div className="activity-track"><div className="activity-bar" style={{ height: `${(point.value / maximum) * 100}%` }} /></div><span className="activity-label">{point.label}</span></div>)}</div></figure>;
}

export function DistributionChart({ items, caption = "Community breakdown" }: { items: Array<{ label: string; value: number; color: string }>; caption?: string }) {
  const safeItems = items.map((item) => ({ ...item, value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0 }));
  const total = safeItems.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <p className="chart-empty">No records are available for this breakdown yet.</p>;
  return <figure className="distribution-chart"><figcaption className="chart-caption"><span>{caption}</span><strong>{total.toLocaleString()} total</strong></figcaption><div className="distribution-track" aria-hidden="true">{safeItems.filter((item) => item.value > 0).map((item) => <span key={item.label} style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }} />)}</div><ul className="distribution-legend">{safeItems.map((item) => <li key={item.label}><span><span className="legend-dot" style={{ backgroundColor: item.color }} />{item.label}</span><strong>{item.value.toLocaleString()}<small>{Math.round((item.value / total) * 100)}%</small></strong></li>)}</ul></figure>;
}
