import { EmptyState, PageHeader } from "@/components/admin";
import { Pagination } from "@/components/pagination";
import { getProfiles } from "@/lib/admin/data";
import { pageNumber, searchTerm } from "@/lib/admin/validation";

export default async function ProfilesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = pageNumber(params.page); const q = searchTerm(params.q);
  const data = await getProfiles(page, q);
  return (
    <>
      <PageHeader eyebrow="The people behind the creations" title="Community profiles" description="Read-only access to profile records. Administrator permissions are managed through trusted database access." />
      <form className="filter-form" action="/admin/profiles"><label className="field" htmlFor="profile-search">Find a profile<input id="profile-search" name="q" type="search" maxLength={100} defaultValue={q} placeholder="Search by first or last name" /></label><button className="button button-secondary" type="submit">Search</button></form>
      <section className="panel">
        {data.rows.length === 0 ? <EmptyState title="No profiles found" description={q ? "Try a different name." : "Profiles will appear after users join the creation app."} /> : <div className="table-wrap"><table className="data-table"><thead><tr><th scope="col">Profile</th><th scope="col">User ID</th><th scope="col">Access</th></tr></thead><tbody>{data.rows.map((profile) => <tr key={profile.id}><td><span className="profile-name">{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unnamed profile"}</span></td><td><code>{profile.id}</code></td><td><span className={`badge ${profile.is_superadmin ? "status-published" : ""}`}>{profile.is_superadmin ? "Superadmin" : "Member"}</span></td></tr>)}</tbody></table></div>}
        <Pagination page={page} total={data.total} base="/admin/profiles" filters={{ q }} />
      </section>
    </>
  );
}
