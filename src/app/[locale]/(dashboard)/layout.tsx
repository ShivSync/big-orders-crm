import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, region")
    .eq("id", user.id)
    .single();

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name_en, name_vi, slug)")
    .eq("user_id", user.id);

  const firstRole = userRoles?.[0]?.roles as unknown as
    | { name_en: string; name_vi: string }
    | undefined;
  const roleName = firstRole
    ? locale === "vi"
      ? firstRole.name_vi
      : firstRole.name_en
    : "User";

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={profile?.name || user.email || "User"}
          userRole={roleName}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
