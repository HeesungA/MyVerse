-- =============================================
-- MyVerse Supabase Schema
-- Supabase SQL Editor에 순서대로 실행하세요
-- =============================================

-- 1. 크리에이터 (auth.users와 1:1)
CREATE TABLE creators (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  instagram_handle TEXT,
  instagram_access_token TEXT,
  store_slug TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro' | 'scale'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 상품
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- 원 단위
  type TEXT NOT NULL DEFAULT 'digital', -- 'vod' | 'digital' | 'coaching' | 'form'
  thumbnail_url TEXT,
  content_url TEXT, -- VOD/디지털 파일 URL
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 구매자
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, phone)
);

-- 4. 주문
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending' | 'completed' | 'refunded'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 이벤트 로그 (퍼널 추적)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'page_view' | 'view_content' | 'add_to_cart' | 'purchase'
  product_id UUID REFERENCES products(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CRM 발송 내역
CREATE TABLE crm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  trigger_type TEXT NOT NULL, -- 'd0' | 'd3' | 'd7' | 'd30' | 'cart_abandon' | 'announcement'
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  solapi_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. AI 리포트
CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'weekly' | 'funnel' | 'content' | 'crm'
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX idx_products_creator ON products(creator_id);
CREATE INDEX idx_products_active ON products(creator_id, is_active);
CREATE INDEX idx_orders_creator ON orders(creator_id);
CREATE INDEX idx_orders_created ON orders(creator_id, created_at DESC);
CREATE INDEX idx_events_creator ON events(creator_id);
CREATE INDEX idx_events_type ON events(creator_id, event_type, created_at DESC);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_crm_messages_creator ON crm_messages(creator_id);
CREATE INDEX idx_crm_messages_customer ON crm_messages(customer_id);

-- =============================================
-- RLS (Row Level Security)
-- =============================================
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- creators: 본인만 읽기/수정
CREATE POLICY "creators_own" ON creators
  FOR ALL USING (auth.uid() = id);

-- products: 크리에이터는 자기 상품 CRUD, 퍼블릭은 활성 상품 읽기
CREATE POLICY "products_own_crud" ON products
  FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = true);

-- customers: 크리에이터만 자기 구매자 조회
CREATE POLICY "customers_own" ON customers
  FOR ALL USING (auth.uid() = creator_id);

-- orders: 크리에이터만 자기 주문 조회
CREATE POLICY "orders_own" ON orders
  FOR ALL USING (auth.uid() = creator_id);

-- events: 크리에이터만 자기 이벤트 조회, 퍼블릭은 INSERT 가능
CREATE POLICY "events_own_read" ON events
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "events_public_insert" ON events
  FOR INSERT WITH CHECK (true);

-- crm_messages: 크리에이터만
CREATE POLICY "crm_own" ON crm_messages
  FOR ALL USING (auth.uid() = creator_id);

-- ai_reports: 크리에이터만
CREATE POLICY "ai_reports_own" ON ai_reports
  FOR ALL USING (auth.uid() = creator_id);

-- =============================================
-- 트리거: auth.users → creators 자동 생성
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.creators (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 스토어 slug로 크리에이터 정보 조회 함수 (퍼블릭 접근용)
-- =============================================
CREATE OR REPLACE FUNCTION get_store_by_slug(p_slug TEXT)
RETURNS TABLE (
  creator_id UUID,
  creator_name TEXT,
  instagram_handle TEXT,
  store_slug TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.instagram_handle, c.store_slug
  FROM creators c
  WHERE c.store_slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
