import { createClient } from '@supabase/supabase-js';

// Conexão com o banco de teste. As chaves vêm do arquivo .env (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !chave) {
  throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
}

export const supabase = createClient(url, chave);
