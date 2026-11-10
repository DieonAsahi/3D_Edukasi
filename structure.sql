-- ==============================================================================
-- Ara (3D Virtual Companion) - Database Schema, RLS, Auto-Seeder & Demo Seed
-- Target: Supabase PostgreSQL (Supports Google OAuth and Guest/Anonymous Users)
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    is_guest BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);


-- 2. Mood Logs Table
CREATE TABLE IF NOT EXISTS public.mood_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mood_score INT NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
    stress_level TEXT NOT NULL CHECK (stress_level IN ('low', 'medium', 'high')),
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for mood_logs
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mood logs" ON public.mood_logs;
CREATE POLICY "Users can view their own mood logs"
    ON public.mood_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own mood logs" ON public.mood_logs;
CREATE POLICY "Users can insert their own mood logs"
    ON public.mood_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own mood logs" ON public.mood_logs;
CREATE POLICY "Users can update their own mood logs"
    ON public.mood_logs FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own mood logs" ON public.mood_logs;
CREATE POLICY "Users can delete their own mood logs"
    ON public.mood_logs FOR DELETE
    USING (auth.uid() = user_id);


-- 3. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    action_triggered TEXT NOT NULL DEFAULT 'none' CHECK (action_triggered IN ('none', 'box_breathing', 'pomodoro')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view their own chat messages"
    ON public.chat_messages FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert their own chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can update their own chat messages"
    ON public.chat_messages FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can delete their own chat messages"
    ON public.chat_messages FOR DELETE
    USING (auth.uid() = user_id);


-- 4. Productivity Tasks Table
CREATE TABLE IF NOT EXISTS public.productivity_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 25 CHECK (duration_minutes > 0),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for productivity_tasks
ALTER TABLE public.productivity_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own productivity tasks" ON public.productivity_tasks;
CREATE POLICY "Users can view their own productivity tasks"
    ON public.productivity_tasks FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own productivity tasks" ON public.productivity_tasks;
CREATE POLICY "Users can insert their own productivity tasks"
    ON public.productivity_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own productivity tasks" ON public.productivity_tasks;
CREATE POLICY "Users can update their own productivity tasks"
    ON public.productivity_tasks FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own productivity tasks" ON public.productivity_tasks;
CREATE POLICY "Users can delete their own productivity tasks"
    ON public.productivity_tasks FOR DELETE
    USING (auth.uid() = user_id);


-- Helpful Indexes
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id_created ON public.mood_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id_created ON public.chat_messages(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_productivity_tasks_user_id_created ON public.productivity_tasks(user_id, created_at DESC);


-- ==============================================================================
-- 5. Auto-Seeder Trigger for New Users (Google OAuth & Anonymous Guest)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile row
    INSERT INTO public.profiles (id, display_name, is_guest)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Sahabat Ara'),
        COALESCE((new.raw_user_meta_data->>'is_guest')::boolean, new.is_anonymous, false)
    )
    ON CONFLICT (id) DO NOTHING;

    -- Auto-seed initial experience data for every new user (skip explicit demo account seeded below)
    IF new.id <> '00000000-0000-0000-0000-000000000001'::uuid THEN
        -- 1. Warm greeting from Ara
        INSERT INTO public.chat_messages (user_id, role, content, action_triggered)
        VALUES (
            new.id,
            'assistant',
            'Halo! Aku Ara, sahabat virtualmu. Aku siap mendengarkan ceritamu hari ini tanpa menghakimi. Bagaimana perasaanmu saat ini?',
            'none'
        );

        -- 2. Initial 3 mood log examples so mood history/chart is populated
        INSERT INTO public.mood_logs (user_id, mood_score, stress_level, note, created_at)
        VALUES
            (new.id, 4, 'low', 'Selesai olahraga pagi dan pernapasan 4-7-8, pikiran terasa jauh lebih tenang.', NOW() - INTERVAL '1 day'),
            (new.id, 3, 'medium', 'Cukup padat dengan jadwal kuliah & tugas, tetap terkendali menggunakan blok waktu.', NOW() - INTERVAL '2 days'),
            (new.id, 2, 'high', 'Sempat overthinking soal deadline malam hari sebelum beristirahat.', NOW() - INTERVAL '3 days');

        -- 3. Initial 2 Pomodoro productivity tasks
        INSERT INTO public.productivity_tasks (user_id, title, duration_minutes, is_completed)
        VALUES
            (new.id, 'Menyusun Bab 1 Skripsi', 25, false),
            (new.id, 'Review materi presentasi', 15, false);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 6. Demo Seed Data (Immediately Visible in Supabase Dashboard)
-- ==============================================================================
DO $$
DECLARE
    demo_uid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Create fixed demo user in auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        is_anonymous
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        demo_uid,
        'authenticated',
        'authenticated',
        'demo.ara@gmail.com',
        '',
        NOW(),
        '{"provider": "google", "providers": ["google"]}'::jsonb,
        '{"full_name": "Mahasiswa Demo (Google)", "name": "Mahasiswa Demo", "is_guest": false}'::jsonb,
        NOW(),
        NOW(),
        false
    )
    ON CONFLICT (id) DO NOTHING;

    -- Ensure profile exists for demo account
    INSERT INTO public.profiles (id, display_name, is_guest)
    VALUES (demo_uid, 'Mahasiswa Demo (Google)', false)
    ON CONFLICT (id) DO NOTHING;

    -- Seed 4 Mood Logs for demo user (only if empty)
    IF NOT EXISTS (SELECT 1 FROM public.mood_logs WHERE user_id = demo_uid) THEN
        INSERT INTO public.mood_logs (user_id, mood_score, stress_level, note, created_at)
        VALUES
            (demo_uid, 4, 'low', 'Selesai olahraga pagi dan meditasi 4-7-8 bersama Ara, pikiran terasa sangat jernih.', NOW() - INTERVAL '1 day'),
            (demo_uid, 3, 'medium', 'Lumayan sibuk mengejar jadwal bimbingan, tapi masih terkendali dengan Pomodoro.', NOW() - INTERVAL '2 days'),
            (demo_uid, 2, 'high', 'Sempat overthinking soal deadline malam hari sebelum akhirnya curhat ke Ara.', NOW() - INTERVAL '3 days'),
            (demo_uid, 4, 'low', 'Berhasil menyelesaikan draft outline presentasi tepat waktu.', NOW() - INTERVAL '4 days');
    END IF;

    -- Seed Chat Messages (Ara greeting + user vent + CBT response)
    IF NOT EXISTS (SELECT 1 FROM public.chat_messages WHERE user_id = demo_uid) THEN
        INSERT INTO public.chat_messages (user_id, role, content, action_triggered, created_at)
        VALUES
            (
                demo_uid,
                'assistant',
                'Halo! Aku Ara, sahabat virtualmu. Aku siap mendengarkan ceritamu hari ini tanpa menghakimi. Bagaimana perasaanmu saat ini?',
                'none',
                NOW() - INTERVAL '60 minutes'
            ),
            (
                demo_uid,
                'user',
                'Akhir-akhir ini aku merasa agak lelah membagi waktu antara revisi skripsi dan persiapan presentasi minggu depan.',
                'none',
                NOW() - INTERVAL '58 minutes'
            ),
            (
                demo_uid,
                'assistant',
                'Wajar sekali merasa kewalahan saat dua tanggung jawab besar datang bersamaan. Kamu sudah berusaha keras sejauh ini. Bagaimana kalau kita pecah menjadi langkah kecil dengan satu blok fokus 25 menit saja untuk Bab 1?',
                'pomodoro',
                NOW() - INTERVAL '57 minutes'
            );
    END IF;

    -- Seed 2 Pomodoro Productivity Tasks
    IF NOT EXISTS (SELECT 1 FROM public.productivity_tasks WHERE user_id = demo_uid) THEN
        INSERT INTO public.productivity_tasks (user_id, title, duration_minutes, is_completed)
        VALUES
            (demo_uid, 'Menyusun Bab 1 Skripsi', 25, false),
            (demo_uid, 'Review materi presentasi', 15, true);
    END IF;
END $$;
