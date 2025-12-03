-- Supabase Database Setup for Rodin API UI
-- Run this in your Supabase SQL Editor after creating your new project

-- Create user_settings table for storing API keys
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    groq_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security on user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Optional: Create a table for storing video processing jobs (if needed)
CREATE TABLE IF NOT EXISTS video_jobs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    subtitles JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on video_jobs
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for video_jobs
CREATE POLICY "Users can view their own jobs" ON video_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON video_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON video_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for video_jobs updated_at
CREATE TRIGGER set_video_jobs_updated_at
    BEFORE UPDATE ON video_jobs
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
