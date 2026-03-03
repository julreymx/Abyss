-- Create table "archivos" for the Abyss Gallery
CREATE TABLE IF NOT EXISTS public.archivos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    url TEXT NOT NULL,
    posicion_x FLOAT NOT NULL,
    posicion_y FLOAT NOT NULL,
    posicion_z FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.archivos ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert messages (since visitors are not authenticated)
CREATE POLICY "Allow anonymous inserts" ON public.archivos FOR INSERT WITH CHECK (true);

-- Allow anonymous users to read messages for the canvas
CREATE POLICY "Allow anonymous selects" ON public.archivos FOR SELECT USING (true);
