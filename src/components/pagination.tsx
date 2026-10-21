import Link from "next/link";

export function Pagination({ page, total, base, filters = {} }: {
  page: number; total: number; base: string; filters?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / 20));
  const href = (next: number) => `${base}?${new URLSearchParams({ ...filters, page: String(next) })}`;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>{total.toLocaleString()} records · Page {page} of {pages}</span>
      <div className="pagination-actions">
        {page > 1 && <Link className="button button-secondary" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="button button-secondary" href={href(page + 1)}>Next</Link>}
      </div>
    </nav>
  );
}
