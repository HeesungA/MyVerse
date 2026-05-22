import { Instagram, Lock } from "lucide-react";
import Link from "next/link";

export default function InstagramPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">인스타 인사이트</h1>
        <p className="text-sm text-gray-400 mt-1">Instagram 계정 데이터를 분석합니다</p>
      </div>

      <div className="card text-center py-16">
        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Instagram size={24} className="text-gray-300" strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-2">Instagram 연동이 필요합니다</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
          Meta 앱 심사 완료 후 연동하면 Reels 도달률, 프로필 방문자, 팔로워 인사이트를 볼 수 있습니다.
        </p>
        <Link href="/dashboard/connect"
          className="btn-primary inline-flex items-center gap-2">
          <Lock size={14} />
          연동 관리로 이동
        </Link>
      </div>
    </div>
  );
}
