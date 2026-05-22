"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError(`[${error.status ?? "err"}] ${error.message}`);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">MyVerse</h1>
          <p className="text-gray-500 mt-2 text-sm">크리에이터 수익화 플랫폼</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">크리에이터 가입</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="label">이름 (활동명)</label>
              <input
                type="text"
                className="input"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">이메일</label>
              <input
                type="email"
                className="input"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">비밀번호</label>
              <input
                type="password"
                className="input"
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "가입 중..." : "시작하기 (무료)"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
