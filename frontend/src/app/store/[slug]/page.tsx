import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StoreClient from "./StoreClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getStoreData(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/products/public/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getStoreData(params.slug);
  if (!data) return { title: "스토어를 찾을 수 없습니다" };
  return {
    title: `${data.creator.creator_name}의 스토어 — MyVerse`,
    description: `${data.creator.creator_name}의 디지털 상품 스토어`,
  };
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const data = await getStoreData(params.slug);
  if (!data) notFound();

  return <StoreClient creator={data.creator} products={data.products} />;
}
