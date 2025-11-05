-- Week Number Tracking Upgrade
-- Adds year column and improves week tracking for Couples_weekly_checkins

-- Add year column to track which year the check-in belongs to
ALTER TABLE public."Couples_weekly_checkins"
ADD COLUMN IF NOT EXISTS year INT;

-- Create index for faster queries by week and year
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_week_year 
ON public."Couples_weekly_checkins"(couple_id, year DESC, week_number DESC);

-- Function to get ISO week number from a timestamp
CREATE OR REPLACE FUNCTION get_iso_week_number(check_date TIMESTAMPTZ)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  week_num INT;
BEGIN
  -- Extract ISO week number (1-53)
  week_num := EXTRACT(WEEK FROM check_date);
  RETURN week_num;
END;
$$;

-- Function to get ISO week year from a timestamp
CREATE OR REPLACE FUNCTION get_iso_week_year(check_date TIMESTAMPTZ)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  week_year INT;
BEGIN
  -- Extract ISO year for the week
  week_year := EXTRACT(ISOYEAR FROM check_date);
  RETURN week_year;
END;
$$;

-- Update existing records with correct year
UPDATE public."Couples_weekly_checkins"
SET year = EXTRACT(ISOYEAR FROM created_at)
WHERE year IS NULL;

-- Create a trigger to automatically set week_number and year on insert
CREATE OR REPLACE FUNCTION set_week_number_and_year()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-calculate week number and year if not provided
  IF NEW.week_number IS NULL THEN
    NEW.week_number := get_iso_week_number(NEW.created_at);
  END IF;
  
  IF NEW.year IS NULL THEN
    NEW.year := get_iso_week_year(NEW.created_at);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-populating week_number and year
DROP TRIGGER IF EXISTS trigger_set_week_number_and_year ON public."Couples_weekly_checkins";
CREATE TRIGGER trigger_set_week_number_and_year
  BEFORE INSERT ON public."Couples_weekly_checkins"
  FOR EACH ROW
  EXECUTE FUNCTION set_week_number_and_year();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_iso_week_number(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_iso_week_year(TIMESTAMPTZ) TO authenticated;

COMMENT ON COLUMN public."Couples_weekly_checkins".week_number IS 'ISO week number (1-53) for the check-in';
COMMENT ON COLUMN public."Couples_weekly_checkins".year IS 'ISO year for the week (handles year boundaries correctly)';
