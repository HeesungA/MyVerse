import Link from "next/link";

const features = [
  {
    emoji: "🛒",
    title: "온라인 스토어 개설",
    desc: "수수료 없이 나만의 스토어를 5분 만에 오픈. 디지털 콘텐츠부터 실물 상품까지 한 곳에서 판매하고, 구매자 데이터는 오직 나만 소유합니다.",
    highlight: "수수료 0%",
  },
  {
    emoji: "💬",
    title: "CRM 자동화",
    desc: "구매 후 자동 문자 발송, 재구매 리마인더, VIP 고객 세그먼트 관리까지. 팔로워를 한 번만 설정하면 AI가 알아서 재구매로 이어줍니다.",
    highlight: "자동화 CRM",
  },
  {
    emoji: "🤖",
    title: "AI 퍼널 분석",
    desc: "어떤 게시물이 구매로 이어졌는지, 이탈 구간은 어디인지 AI가 실시간 분석. 다음 콘텐츠 전략까지 추천해드립니다.",
    highlight: "AI 최적화",
  },
];

const stats = [
  { value: "0%", label: "판매 수수료" },
  { value: "5분", label: "스토어 개설" },
  { value: "3배", label: "재구매율 향상" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ───── NAV ───── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-700 tracking-tight">
            MyVerse
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors px-4 py-2"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="btn-primary"
            >
              무료로 시작하기
            </Link>
          </nav>
        </div>
      </header>

      {/* ───── HERO ───── */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-brand-50 via-purple-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-100 px-3 py-1 rounded-full mb-6">
            ✨ 인스타그램 크리에이터 전용
          </span>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            팔로워를{" "}
            <span className="text-brand-600">실질 매출</span>로
            <br />
            전환하세요
          </h1>

          {/* Sub-headline */}
          <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            인스타그램 크리에이터를 위한 올인원 수익화 플랫폼 —{" "}
            <br className="hidden sm:block" />
            스토어 개설부터 CRM 자동화, AI 퍼널 분석까지 한 곳에서.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-8 rounded-xl text-base transition-colors shadow-lg shadow-brand-600/20"
            >
              지금 시작하기 →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-8 rounded-xl text-base transition-colors border border-gray-200"
            >
              로그인
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-6 text-sm text-gray-400">
            신용카드 불필요 · 무료로 시작 · 언제든 해지 가능
          </p>
        </div>
      </section>

      {/* ───── STATS ───── */}
      <section className="py-12 px-6 border-y border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-extrabold text-brand-600">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section className="py-24 px-6 bg-[#f5f5f7]">
        <div className="max-w-6xl mx-auto">
          {/* Section title */}
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              수익화에 필요한 모든 것
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              기존 플랫폼은 수수료 50~80%에 구매자 데이터도 없습니다.
              <br />
              MyVerse는 인프라 전체를 제공하고, AI가 최적화합니다.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="text-4xl">{f.emoji}</div>
                <div>
                  <span className="inline-block text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full mb-2">
                    {f.highlight}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900">{f.title}</h3>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA BANNER ───── */}
      <section className="py-24 px-6 bg-gradient-to-r from-brand-600 to-violet-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            지금 바로 스토어를 개설하세요
          </h2>
          <p className="text-brand-100 text-lg mb-10">
            5분이면 충분합니다. 팔로워가 곧 매출이 됩니다.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white hover:bg-gray-50 text-brand-700 font-bold py-3.5 px-10 rounded-xl text-base transition-colors shadow-xl"
          >
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="py-10 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold text-brand-700">MyVerse</span>
          <p className="text-sm text-gray-400">
            © 2026 MyVerse. 인스타그램 크리에이터를 위한 올인원 수익화 플랫폼.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-700 transition-colors">로그인</Link>
            <Link href="/signup" className="hover:text-gray-700 transition-colors">회원가입</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
