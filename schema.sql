-- Create custom types for structured columns
CREATE TYPE lead_score AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'calling', 'converted', 'rejected');
CREATE TYPE call_outcome AS ENUM ('interested', 'busy', 'no_answer', 'not_interested', 'failed');

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    company VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    ai_score lead_score DEFAULT NULL,
    ai_reasoning TEXT,
    status lead_status DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Campaigns (ICP) Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    target_industry VARCHAR(150),
    target_company_size VARCHAR(100),
    pain_points TEXT,
    system_prompt_override TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Calls Table (linked to leads)
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    room_name VARCHAR(255) NOT NULL,
    transcript TEXT,
    outcome call_outcome DEFAULT 'no_answer',
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
