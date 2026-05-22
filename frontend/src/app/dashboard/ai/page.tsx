import { Sparkles, ArrowRight } from "lucide-react";

export default function AiPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI 처방</h1>
        <p className="text-sm text-gray-400 mt-1">Claude AI가 데이터를 분석하고 액션을 제안합니다</p>
      </div>

      <div className="card text-center py-16">
        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles size={22} className="text-violet-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-2">데이터가 쌓이면 분석이 시작됩니다</h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          스토어 방문자와 구매 데이터가 충분히 쌓이면 Claude AI가 주간 처방 리포트를 생성합니다.
        </p>
      </div>
    </div>
  );
}
