-- Add payment mode to games table
ALTER TABLE public.games 
ADD COLUMN payment_mode text NOT NULL DEFAULT 'pay_to_join' 
CHECK (payment_mode IN ('pay_to_join', 'confirm_first'));

-- Add payment deadline hours (24 or 48) for confirm_first mode
ALTER TABLE public.games 
ADD COLUMN payment_deadline_hours integer DEFAULT 48;

-- Add payment_status to join_requests for tracking payment state
ALTER TABLE public.join_requests 
ADD COLUMN payment_status text NOT NULL DEFAULT 'not_required'
CHECK (payment_status IN ('not_required', 'pending', 'submitted', 'verified', 'failed'));

-- Add payment_due_at for when payment is needed
ALTER TABLE public.join_requests 
ADD COLUMN payment_due_at timestamp with time zone;

-- Add rejection reason for better UX
ALTER TABLE public.join_requests 
ADD COLUMN rejection_reason text;