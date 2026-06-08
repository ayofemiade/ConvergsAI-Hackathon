-- 1. Add user_id column to tables
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Leads
DROP POLICY IF EXISTS "Users can manage their own leads" ON leads;
CREATE POLICY "Users can manage their own leads" 
ON leads FOR ALL 
USING (auth.uid() = user_id);

-- Campaigns
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON campaigns;
CREATE POLICY "Users can manage their own campaigns" 
ON campaigns FOR ALL 
USING (auth.uid() = user_id);

-- Calls
DROP POLICY IF EXISTS "Users can manage their own calls" ON calls;
CREATE POLICY "Users can manage their own calls" 
ON calls FOR ALL 
USING (auth.uid() = user_id);
