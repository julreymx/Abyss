import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL    || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Entorno activo: usa PROD de Vite (true en cualquier build de producción) como fuente de verdad
// VITE_APP_ENV solo se usa para override manual en dev
const APP_ENV = import.meta.env.PROD
    ? 'production'
    : (import.meta.env.VITE_APP_ENV || 'dev')

/**
 * Inserts a new cryptic message (infection) from a visitor.
 * Writes the current environment so dev/prod data stays separated.
 */
export async function insertInfection(mensaje, color = '#ffffff', userId = null, userEmail = null, font = 'mono') {
  try {
    const { data, error } = await supabase
      .from('infecciones')
      .insert([{ mensaje, color, font, environment: APP_ENV, user_id: userId, user_email: userEmail }])
      .select()

    if (error) {
      // Fallback si font o environment aún no existen como columnas
      if (error.code === '42703') {
        console.warn('Columna desconocida → reintentando sin font/environment...');
        const fallback = await supabase
          .from('infecciones')
          .insert([{ mensaje, color, user_id: userId, user_email: userEmail }])
          .select()
        if (fallback.error) throw fallback.error
        return fallback.data
      }
      throw error
    }
    return data
  } catch (err) {
    console.error('Error inserting infection:', err)
    return null
  }
}

/**
 * Subscribes to new infections in real-time — solo del entorno actual.
 */
export function subscribeToInfections(callback) {
  const ENV = APP_ENV;
  return supabase
    .channel(`infecciones-realtime-${ENV}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'infecciones' },
      (payload) => {
        const env = payload.new.environment;
        const match = ENV === 'production'
          ? env === 'production'
          : env === 'dev' || env === null || env === undefined;
        if (match) callback(payload.new);
      }
    )
    .subscribe();
}

/**
 * Retrieves the latest infections for the current environment.
 * Production: strict 'production' only.
 * Dev: no filter — show all infections so test data is always visible locally.
 */
export async function getRecentInfections(limit = 150) {
  try {
    let query = supabase
      .from('infecciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (APP_ENV === 'production') {
      query = query.eq('environment', 'production');
    }
    // dev: no filter, show everything

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching infections:', err);
    return [];
  }
}

/**
 * Limpia solo las infecciones del entorno actual.
 */
export async function limpiarAbismo() {
  const { error } = await supabase
    .from('infecciones')
    .delete()
    .eq('environment', APP_ENV)
    .neq('id', '00000000-0000-0000-0000-000000000000');
  return !error;
}

/**
 * Deletes a single infection by id (god mode only).
 */
export async function deleteInfection(id) {
  try {
    const { error } = await supabase
      .from('infecciones')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting infection:', err);
    return false;
  }
}
