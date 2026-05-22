import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: creator } = await supabase
    .from("creators")
    .select("name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar creatorName={creator?.name ?? "크리에이터"} />
      <main className="flex-1 ml-[220px] min-h-screen">
        {children}
      </main>
    </div>
  );
}
