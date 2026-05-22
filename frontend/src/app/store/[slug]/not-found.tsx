import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-6xl mb-6">🏚️</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">스토어를 찾을 수 없어요</h1>
        <p className="text-gray-500 mb-6">주소를 다시 확인해주세요</p>
        <Link href="/" className="btn-primary inline-block">홈으로</Link>
      </div>
    </div>
  );
}
