export type ProductType = "vod" | "digital" | "coaching" | "form";

export interface Creator {
  id: string;
  email: string;
  name: string;
  instagram_handle: string | null;
  store_slug: string | null;
  plan: "free" | "pro" | "scale";
  created_at: string;
}

export interface Product {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  price: number;
  type: ProductType;
  thumbnail_url: string | null;
  content_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  creator_id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  creator_id: string;
  customer_id: string;
  product_id: string;
  amount: number;
  status: "pending" | "completed" | "refunded";
  created_at: string;
  customers?: Pick<Customer, "name" | "phone" | "email">;
  products?: Pick<Product, "title" | "type">;
}

export interface FunnelData {
  period_days: number;
  page_views: number;
  view_contents: number;
  add_to_carts: number;
  purchases: number;
  revenue: number;
  conversion_rates: {
    page_to_content: number;
    content_to_cart: number;
    cart_to_purchase: number;
    overall: number;
  };
  bottleneck: string;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  vod: "VOD 강의",
  digital: "디지털 자료",
  coaching: "코칭/상담",
  form: "폼 기반 신청",
};
