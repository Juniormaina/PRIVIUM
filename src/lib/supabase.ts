import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://mfxkgqrwwyvpdjvdtuwj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meGtncXJ3d3l2cGRqdmR0dXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzM2OTksImV4cCI6MjA5OTI0OTY5OX0.co8L2d3gLhEwlT4HJjHktJvwTPfOsfdZ-2A4nthOBfw';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);