// Supabase Configuration with default fallbacks for seamless Vercel production hosting
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nonsgoepkqloeyzlpvys.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbnNnb2Vwa3Fsb2V5emxwdnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODk3NTcsImV4cCI6MjExMDg2NTc1N30.1LOnaWcqYHLkttDOlV6T5u8FC8zXI5DUD2hVNwkDZiU';
