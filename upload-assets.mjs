import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://bsbqzhfvkahfmqjxygrj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYnF6aGZ2a2FoZm1xanh5Z3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTc4NjQsImV4cCI6MjA4ODA3Mzg2NH0.cn8jU4Ejmq8kbejdtpX4sfF7iwNCoYLAmH0FNczVNg0';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Posiciones dentro de la nebulosa (radio ~15, no en el centro)
const POSITIONS = [
    { x: 6.5, y: 3.2, z: -7 },
    { x: -8.0, y: 1.5, z: -11 },
    { x: 2.0, y: -6.0, z: -5 },
    { x: -4.5, y: 7.0, z: -9 },
    { x: 10.0, y: -3.5, z: -13 },
    { x: -7.0, y: -5.0, z: -6 },
];

const ASSETS = [
    { file: 'img7 (0-00-00-17).png', slug: 'img7.png', tipo: 'image/png' },
    { file: 'Me vale 4 quesos.jpeg', slug: 'me-vale-4-quesos.jpeg', tipo: 'image/jpeg' },
    { file: 'pub1.png', slug: 'pub1.png', tipo: 'image/png' },
    { file: 'Untitled.png', slug: 'untitled.png', tipo: 'image/png' },
    { file: 'acid125.mp4', slug: 'acid125.mp4', tipo: 'video/mp4' },
    { file: 'acid250.mp4', slug: 'acid250.mp4', tipo: 'video/mp4' },
];

const SOURCE_DIR = path.join(__dirname, 'IMAGENES UP');
const BUCKET = 'archivos-abyss';

async function uploadAll() {
    console.log('🚀 Iniciando upload de 6 activos digitales al Abismo...\n');

    for (let i = 0; i < ASSETS.length; i++) {
        const asset = ASSETS[i];
        const pos = POSITIONS[i];
        const filePath = path.join(SOURCE_DIR, asset.file);

        if (!fs.existsSync(filePath)) {
            console.error(`❌ Archivo no encontrado: ${asset.file}`);
            continue;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileSize = (fileBuffer.length / 1024 / 1024).toFixed(2);
        console.log(`📤 [${i + 1}/6] Subiendo: ${asset.file} (${fileSize} MB)...`);

        // Upload a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(asset.slug, fileBuffer, {
                contentType: asset.tipo,
                upsert: true,        // sobreescribir si ya existe
            });

        if (uploadError) {
            console.error(`   ❌ Error upload: ${uploadError.message}`);
            continue;
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(asset.slug);

        const publicUrl = urlData.publicUrl;
        console.log(`   ✅ URL: ${publicUrl}`);

        // Insertar registro en tabla archivos
        const { data: dbData, error: dbError } = await supabase
            .from('archivos')
            .upsert({
                nombre: asset.file,
                tipo: asset.tipo,
                url: publicUrl,
                posicion_x: pos.x,
                posicion_y: pos.y,
                posicion_z: pos.z,
            }, { onConflict: 'url' })
            .select();

        if (dbError) {
            console.error(`   ❌ Error DB: ${dbError.message}`);
        } else {
            console.log(`   ✅ DB record creado: id=${dbData?.[0]?.id?.slice(0, 8)}...`);
        }
    }

    console.log('\n✨ Upload completado. Verifica en localhost:5173 — los assets aparecerán en la nebulosa.');
}

uploadAll().catch(console.error);
