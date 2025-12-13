-- Create expense_categories table for preset + custom categories
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (no auth yet)
CREATE POLICY "Allow all access to expense_categories"
ON public.expense_categories
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert preset categories
INSERT INTO public.expense_categories (name, is_preset) VALUES
  ('Repairs', true),
  ('Utilities', true),
  ('Security', true),
  ('Cleaning', true),
  ('Garbage Collection', true),
  ('Maintenance', true);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow all access for now
CREATE POLICY "Allow all access to expenses"
ON public.expenses
FOR ALL
USING (true)
WITH CHECK (true);