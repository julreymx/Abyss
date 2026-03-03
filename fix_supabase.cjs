const fs = require('fs');
let content = fs.readFileSync('src/services/supabase.js', 'utf8');

// The prompt specifically requested changing the subscribeToInfections function if it didn't match.
// Current version uses 'public:infecciones'. Prompt says: 'infecciones-realtime'
content = content.replace(
  /export function subscribeToInfections[\s\S]*?\.subscribe\(\)\n}/,
  `export function subscribeToInfections(callback) {
  return supabase
    .channel('infecciones-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'infecciones' },
      (payload) => callback(payload.new))
    .subscribe();
}`
);

fs.writeFileSync('src/services/supabase.js', content);
