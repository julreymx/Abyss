/**
 * Test real de upload al bucket archivos-abyss
 */
const SUPABASE_URL = 'https://bsbqzhfvkahfmqjxygrj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYnF6aGZ2a2FoZm1xanh5Z3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTc4NjQsImV4cCI6MjA4ODA3Mzg2NH0.cn8jU4Ejmq8kbejdtpX4sfF7iwNCoYLAmH0FNczVNg0';

async function testBucketUpload() {
    console.log('🧪 Probando upload al bucket archivos-abyss...');

    // Crear un pequeño archivo de prueba (1x1 pixel PNG)
    const testFile = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    const blob = new Blob([testFile], { type: 'image/png' });
    formData.append('file', blob, 'test.png');

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/archivos-abyss/test_${Date.now()}.png`, {
        method: 'POST',
        headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: formData
    });

    const status = res.status;
    const body = await res.text();
    console.log(`  Status: ${status}`);

    if (status === 200 || status === 201) {
        console.log('  ✅ BUCKET FUNCIONA - Upload exitoso:', body);
    } else {
        console.log(`  ❌ ERROR: ${body}`);
        if (body.includes('Bucket not found')) {
            console.log('\n  ⚠️  El bucket se ve diferente desde la UI. Verifica el nombre exacto en:');
            console.log('     https://supabase.com/dashboard/project/bsbqzhfvkahfmqjxygrj/storage/buckets');
            console.log('     El nombre debe ser EXACTAMENTE: archivos-abyss');
        } else if (body.includes('row-level security') || body.includes('violates')) {
            console.log('\n  ⚠️  Bucket existe pero falta política de INSERT para anon.');
            console.log('     En SQL Editor ejecuta:');
            console.log(`
CREATE POLICY "Allow anon upload" ON storage.objects
FOR INSERT TO anon 
WITH CHECK (bucket_id = 'archivos-abyss');`);
        }
    }
}

testBucketUpload().catch(console.error);
