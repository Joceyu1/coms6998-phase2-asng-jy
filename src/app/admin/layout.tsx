import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin";
import { requireSuperadmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSuperadmin();
  return <AdminShell userEmail={user.email}>{children}</AdminShell>;
}
