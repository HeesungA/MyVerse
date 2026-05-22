"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">로그인</h2>

          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-brand-600 font-medium hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
