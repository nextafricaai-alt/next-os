-- Sembule Media | 008 | Event spec sheet field + sound / DJ packages.
-- Safe to re-run. Packages are only added if missing, so prices Tony has changed are never overwritten.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS spec jsonb;

INSERT INTO public.services (code,name,unit,pricing_method,starting_price_ugx,suggested_markup_percent,price_status,scope_notes,price_basis) VALUES
('dj_party','DJ and sound: Party (up to 150 people)','day','fixed',700000,NULL,'suggested','Up to 6 hours. DJ with laptop and controller, 2 speakers, mixer, 1 wireless microphone, basic party lights, setup and sound check.','Suggested starting point. Adjust with Tony.'),
('dj_wedding','DJ and sound: Wedding / introduction','day','fixed',1200000,NULL,'suggested','Up to 8 hours. DJ and MC support, full PA with subs, 4 wireless microphones, ceremony and reception music cues, lights, sound engineer, setup and sound check.','Suggested starting point. Adjust with Tony.'),
('concert_pa','Concert / outdoor event PA (up to 1,000)','day','fixed',2500000,NULL,'suggested','Full line array or large PA with subs, stage monitors, 8+ microphones, mixing desk, engineer, assistant and electrician. Generator and fuel quoted separately.','Suggested starting point. Adjust with Tony.'),
('conference_pa','Conference sound (up to 300 delegates)','day','fixed',900000,NULL,'suggested','Podium, 2 lapel and 4 handheld microphones, ceiling or table speakers, mixer, recording of the room audio, sound engineer.','Suggested starting point. Adjust with Tony.'),
('led_light','Stage lighting package','day','fixed',500000,NULL,'suggested','LED wash and effect lights, stands, controller and operator.','Suggested starting point. Adjust with Tony.'),
('extra_mic','Extra wireless microphone','day','fixed',50000,NULL,'suggested','One wireless handheld or lapel microphone with fresh batteries.','Suggested starting point. Adjust with Tony.'),
('sound_hire','Sound equipment dry hire (no crew)','day','fixed',300000,NULL,'suggested','Equipment only, collected and returned by the hirer. Refundable deposit applies. See Hire and deposits.','Suggested starting point. Adjust with Tony.')
ON CONFLICT (code) DO NOTHING;
