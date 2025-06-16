-- Drop the existing foreign key constraint
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_created_by_fkey;

-- Create a function to validate created_by against both tables
CREATE OR REPLACE FUNCTION public.validate_receipt_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the ID exists in either admin or company_user table
  IF EXISTS (
    SELECT 1 FROM public.admin WHERE id = NEW.created_by AND status = true
    UNION
    SELECT 1 FROM public.company_user WHERE id = NEW.created_by AND active_status = 'active'
  ) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'created_by must reference a valid ID from either admin or company_user table';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to use the validation function
DROP TRIGGER IF EXISTS validate_receipt_created_by_trigger ON public.receipts;
CREATE TRIGGER validate_receipt_created_by_trigger
  BEFORE INSERT OR UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_receipt_created_by();

-- Add comment explaining the validation
COMMENT ON FUNCTION public.validate_receipt_created_by() IS 
  'Validates that the created_by field in receipts references a valid ID from either admin or company_user table'; 