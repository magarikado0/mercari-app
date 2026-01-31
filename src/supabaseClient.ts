import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://bjcaybfnfwzdreemqjsk.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY2F5YmZuZnd6ZHJlZW1xanNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MzA0ODIsImV4cCI6MjA4NTQwNjQ4Mn0.H4htQdRt9fmS5n6fdaUxkRPfMID0w8orvrcW2zx12pA"

export const supabase = createClient(supabaseUrl, supabaseAnonKey);