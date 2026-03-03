import { createClient } from '@supabase/supabase-js'

// You must add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Inserts a new cryptic message (infection) from a visitor
 * @param {string} mensaje - The cryptic text
 * @param {string} color - Hex color code (e.g. '#ff0000')
 */
export async function insertInfection(mensaje, color = '#ffffff') {
  try {
    const { data, error } = await supabase
      .from('infecciones')
      .insert([{ mensaje, color }])
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error inserting infection:', error)
    return null
  }
}

/**
 * Subscribes to new infections in real-time
 * @param {function} callback - Function to handle the payload when a new infection arrives
 */
export function subscribeToInfections(callback) {
  return supabase
    .channel('infecciones-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'infecciones' },
      (payload) => callback(payload.new))
    .subscribe();
}

/**
 * Retrieves the latest infections to populate the canvas initially
 * @param {number} limit - How many to retrieve
 */
export async function getRecentInfections(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('infecciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching infections:', error)
    return []
  }
}
export async function limpiarAbismo() {
  const { error } = await supabase.from('infecciones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  return !error;
}
