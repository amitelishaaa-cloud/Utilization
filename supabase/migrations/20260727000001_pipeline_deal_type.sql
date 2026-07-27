-- supabase/migrations/20260727000001_pipeline_deal_type.sql

-- 1. Enum type
CREATE TYPE deal_type AS ENUM ('project', 'retainer');

-- 2. deal_type column (nullable תחילה לצורך backfill)
ALTER TABLE pipeline_deals ADD COLUMN deal_type deal_type;
UPDATE pipeline_deals SET deal_type = 'project';
ALTER TABLE pipeline_deals ALTER COLUMN deal_type SET NOT NULL;

-- 3. monthly_hours column (nullable, חובה רק כש-deal_type='retainer')
ALTER TABLE pipeline_deals ADD COLUMN monthly_hours numeric(8,2) CHECK (monthly_hours > 0);

-- 4. expected_end_date — ריטיינר פתוח מותר
ALTER TABLE pipeline_deals ALTER COLUMN expected_end_date DROP NOT NULL;

-- 5. estimated_hours — חובה רק כש-deal_type='project'
ALTER TABLE pipeline_deals ALTER COLUMN estimated_hours DROP NOT NULL;

-- 6. עדכון constraint end_after_start לתמוך ב-NULL
ALTER TABLE pipeline_deals DROP CONSTRAINT chk_deal_end_after_start;
ALTER TABLE pipeline_deals ADD CONSTRAINT chk_deal_end_after_start
  CHECK (expected_end_date IS NULL OR expected_end_date >= expected_start_date);

-- 7. בלעדיות הדדית — בדיוק כדפוס chk_deal_pricing_fields הקיים
ALTER TABLE pipeline_deals ADD CONSTRAINT chk_deal_type_fields CHECK (
  (deal_type = 'project'
    AND estimated_hours IS NOT NULL
    AND monthly_hours IS NULL
    AND expected_end_date IS NOT NULL)
  OR
  (deal_type = 'retainer'
    AND monthly_hours IS NOT NULL
    AND estimated_hours IS NULL)
);
