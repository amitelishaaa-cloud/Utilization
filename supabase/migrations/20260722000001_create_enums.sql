CREATE TYPE plan_type        AS ENUM ('free', 'pro');
CREATE TYPE pricing_type     AS ENUM ('hourly', 'fixed');
CREATE TYPE retainer_pricing AS ENUM ('hourly', 'fixed_monthly');
CREATE TYPE project_status   AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE retainer_status  AS ENUM ('active', 'ended');
CREATE TYPE pipeline_stage   AS ENUM ('inquiry', 'proposal', 'negotiation', 'verbal_close', 'contract');
CREATE TYPE deal_status      AS ENUM ('active', 'won', 'lost');
