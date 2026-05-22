import Link from "next/link";
import { ArrowRight } from "lucide-react";

const SECTIONS = [
  { label: "스토어 정보", desc: "스토어 주소, 활동명, 인스타그램 아이디", href: "/dashboard/store" },
  { label: "요금제", desc: "현재 Free 플랜 · 거래 수수료 3%", href: "#" },
  { label: "알림 설정", desc: "이메일, SMS 알림 수신 여부", href: "#" },
];

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-400 mt-1">계정 및 서비스 설정을 관리합니다</p>
      </div>

      <div className="card divide-y divide-gray-50 p-0 overflow-hidden">
        {SECTIONS.map((s) => (
          <Link key={s.label} href={s.href}
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-800">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
            </div>
            <ArrowRight size={15} className="text-gray-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
