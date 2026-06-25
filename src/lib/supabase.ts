import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Periksa apakah Supabase terkonfigurasi dengan benar (bukan placeholder)
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl !== "YOUR_SUPABASE_URL_HERE" && 
  supabaseKey !== "YOUR_SUPABASE_ANON_KEY_HERE";

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder-url.supabase.co",
  isSupabaseConfigured ? supabaseKey : "placeholder-key"
);
