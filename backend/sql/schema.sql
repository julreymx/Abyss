-- Create table "infecciones" for OS_mental visitors cryptic messages
CREATE TABLE IF NOT EXISTS public.infecciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensaje TEXT NOT NULL,
    color VARCHAR(7) DEFAULT '#ffffff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.infecciones ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert messages (since visitors are not authenticated)
CREATE POLICY "Allow anonymous inserts" ON public.infecciones FOR INSERT WITH CHECK (true);

-- Allow anonymous users to read messages for the canvas
CREATE POLICY "Allow anonymous selects" ON public.infecciones FOR SELECT USING (true);
