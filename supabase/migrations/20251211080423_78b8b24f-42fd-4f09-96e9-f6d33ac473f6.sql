-- Add numbering style column to properties
ALTER TABLE public.properties 
ADD COLUMN numbering_style text NOT NULL DEFAULT 'numbers';

-- Add comment for documentation
COMMENT ON COLUMN public.properties.numbering_style IS 'Unit numbering style: numbers (1,2,3), letters (A,B,C), block_unit (A1,A2,B1), floor_unit (1A,1B,2A)';