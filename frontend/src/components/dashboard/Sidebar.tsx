"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutGrid, ShoppingBag, Mail, Sparkles,
  Link2, Settings, LogOut, BarChart3, Instagram, Users,
} from "lucide-react";

const NAV = [
  {
    section: "메인",
    items: [
      { href: "/dashboard", label: "대시보드", icon: LayoutGrid, exact: true },
      { href: "/dashboard/instagram", label: "인스타 인사이트", icon: Instagram },
      { href: "/dashboard/store", label: "스토어", icon: ShoppingBag },
    ],
  },
  {
    section: "자동화",
    items: [
      { href: "/dashboard/crm", label: "CRM 자동화", icon: Mail },
      { href: "/dashboard/customers", label: "고객 관리", icon: Users },
      { href: "/dashboard/ai", label: "AI 처방", icon: Sparkles },
    ],
  },
  {
    section: "설정",
    items: [
      { href: "/dashboard/analytics", label: "퍼널 분석", icon: BarChart3 },
      { href: "/dashboard/connect", label: "연동 관리", icon: Link2 },
      { href: "/dashboard/settings", label: "설정", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

export default function Sidebar({ creatorName }: { creatorName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-[220px] bg-white border-r border-gray-100 fixed inset-y-0 left-0 flex flex-col">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900 tracking-tight">
          MyVerse
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="section-label">{group.section}</p>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? "nav-item-active" : "nav-item-inactive"}`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 하단 */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-medium text-gray-800 truncate">{creatorName}</p>
          <p className="text-xs text-gray-400 mt-0.5">크리에이터</p>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item nav-item-inactive w-full text-left"
        >
          <LogOut size={16} strokeWidth={1.75} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
