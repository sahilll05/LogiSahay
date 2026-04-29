-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- 1. USERS TABLE
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  business_name TEXT NOT NULL,
  gstin TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'freemium' CHECK (tier IN ('freemium', 'pro', 'enterprise')),
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'gu', 'mr')),
  consent_data_sharing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SHIPMENTS TABLE
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  courier TEXT NOT NULL,
  tracking_id TEXT UNIQUE NOT NULL,
  pickup_pin TEXT NOT NULL,
  delivery_pin TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL CHECK (weight_kg > 0),
  type_cod BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'booked', 'in_transit', 'delivered', 'failed', 'returned')),
  cost_bps NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. GODOWNS TABLE
CREATE TABLE public.godowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.users(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat NUMERIC NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng NUMERIC NOT NULL CHECK (lng BETWEEN -180 AND 180),
  rent_inr NUMERIC NOT NULL CHECK (rent_inr >= 0),
  sqft NUMERIC NOT NULL CHECK (sqft > 0),
  amenities JSONB DEFAULT '[]'::jsonb,
  verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WHATSAPP_LOGS TABLE
CREATE TABLE public.whatsapp_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "to"       TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  msg_type   TEXT        NOT NULL DEFAULT 'text',
  direction  TEXT        NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  simulated  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_users_phone              ON public.users(phone);
CREATE INDEX idx_users_tier               ON public.users(tier);
CREATE INDEX idx_shipments_user_status    ON public.shipments(user_id, status);
CREATE INDEX idx_shipments_tracking       ON public.shipments(tracking_id);
CREATE INDEX idx_godowns_location         ON public.godowns(lat, lng);
CREATE INDEX idx_godowns_verified         ON public.godowns(verified);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);
CREATE INDEX idx_whatsapp_logs_direction  ON public.whatsapp_logs(direction);

-- TRIGGERS: auto-update updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.godowns
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ROW LEVEL SECURITY
ALTER TABLE public.users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.godowns    ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY users_select_own ON public.users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY users_update_own ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

-- SHIPMENTS policies
CREATE POLICY shipments_select_own ON public.shipments FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY shipments_insert_own ON public.shipments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- GODOWNS policies
CREATE POLICY godowns_read_public ON public.godowns FOR SELECT USING (verified = true);
CREATE POLICY godowns_manage_own  ON public.godowns FOR ALL   USING (auth.uid()::text = owner_id::text);
