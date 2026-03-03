/**
 * Script de setup de Supabase para OS_Mental Abyss
 * Crea la tabla 'infecciones' y el bucket 'archivos-abyss' si no existen
 * Ejecutar: node setup-supabase.mjs
 */

const SUPABASE_URL = 'https://bsbqzhfvkahfmqjxygrj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYnF6aGZ2a2FoZm1xanh5Z3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTc4NjQsImV4cCI6MjA4ODA3Mzg2NH0.cn8jU4Ejmq8kbejdtpX4sfF7iwNCoYLAmH0FNczVNg0';

const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

async function testInfeccionesTable() {
    console.log('\n🔍 Verificando tabla infecciones...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/infecciones?limit=1`, { headers });
    const status = res.status;
    const body = await res.text();
    console.log(`  Status: ${status}`);
    if (status === 200) {
        console.log('  ✅ Tabla infecciones EXISTE y es accesible');
        return true;
    } else {
        console.log(`  ❌ Error: ${body}`);
        return false;
    }
}

async function testInsertInfeccion() {
    console.log('\n🔍 Probando INSERT en infecciones...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/infecciones`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ mensaje: 'TEST_SIGNAL', color: '#39FF14' })
    });
    const status = res.status;
    const body = await res.text();
    console.log(`  Status: ${status}`);
    if (status === 201) {
        const data = JSON.parse(body);
        console.log('  ✅ INSERT exitoso:', data[0]);
        // Borrar el test
        if (data[0]?.id) {
            await fetch(`${SUPABASE_URL}/rest/v1/infecciones?id=eq.${data[0].id}`, {
                method: 'DELETE',
                headers
            });
        }
        return true;
    } else {
        console.log(`  ❌ Error: ${body}`);
        return false;
    }
}

async function testStorageBucket() {
    console.log('\n🔍 Verificando bucket archivos-abyss...');
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/archivos-abyss`, { headers });
    const status = res.status;
    const body = await res.text();
    console.log(`  Status: ${status}`);
    if (status === 200) {
        console.log('  ✅ Bucket archivos-abyss EXISTE');
        return true;
    } else {
        console.log(`  ❌ Bucket no existe: ${body}`);
        return false;
    }
}

async function createStorageBucket() {
    console.log('\n🔧 Intentando crear bucket archivos-abyss...');
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: 'archivos-abyss', name: 'archivos-abyss', public: true })
    });
    const status = res.status;
    const body = await res.text();
    console.log(`  Status: ${status}`);
    if (status === 200 || status === 201) {
        console.log('  ✅ Bucket creado exitosamente');
        return true;
    } else {
        console.log(`  ❌ No se pudo crear (necesita privilegios de admin): ${body}`);
        console.log('\n  👉 ACCIÓN MANUAL REQUERIDA:');
        console.log('     1. Ir a: https://supabase.com/dashboard/project/bsbqzhfvkahfmqjxygrj/storage/buckets');
        console.log('     2. Crear bucket: archivos-abyss (marcar como PUBLIC)');
        return false;
    }
}

async function main() {
    console.log('🌊 OS_Mental Abyss — Setup verificador de Supabase\n');

    const tableOk = await testInfeccionesTable();
    if (tableOk) {
        await testInsertInfeccion();
    } else {
        console.log('\n  👉 ACCIÓN MANUAL REQUERIDA:');
        console.log('     Ir al SQL Editor de Supabase:');
        console.log('     https://supabase.com/dashboard/project/bsbqzhfvkahfmqjxygrj/sql/new');
        console.log('     Y ejecutar:');
        console.log(`
CREATE TABLE IF NOT EXISTS public.infecciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje TEXT NOT NULL,
  color TEXT DEFAULT '#ffffff',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.infecciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert" ON public.infecciones FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public select" ON public.infecciones FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public delete" ON public.infecciones FOR DELETE TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.infecciones;
    `);
    }

    const bucketOk = await testStorageBucket();
    if (!bucketOk) {
        await createStorageBucket();
    }

    console.log('\n🏁 Setup completado.');
}

main().catch(console.error);
