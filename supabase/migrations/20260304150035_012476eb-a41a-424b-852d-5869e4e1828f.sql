
-- Change unique constraint: allow 1 credit per giver per receiver per match (instead of 1 total per giver)
ALTER TABLE public.match_credits DROP CONSTRAINT match_credits_match_id_giver_id_key;
ALTER TABLE public.match_credits ADD CONSTRAINT match_credits_match_id_giver_receiver_key UNIQUE (match_id, giver_id, receiver_id);
