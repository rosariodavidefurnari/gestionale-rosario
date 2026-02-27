-- A4: rejection_reason required when status = 'rifiutato'
-- First, fill any existing NULL rejection_reason for rifiutato quotes
UPDATE public.quotes
SET rejection_reason = 'Non specificato'
WHERE status = 'rifiutato' AND (rejection_reason IS NULL OR rejection_reason = '');

-- Add CHECK constraint
ALTER TABLE public.quotes
ADD CONSTRAINT chk_rejection_reason_required
CHECK (status != 'rifiutato' OR (rejection_reason IS NOT NULL AND rejection_reason != ''));
