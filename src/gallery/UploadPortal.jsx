
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

export default function UploadPortal({ isOpen, onClose }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setStatus('UPLOAD IN PROGRESS...');

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('archivos-abyss')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('archivos-abyss')
                .getPublicUrl(fileName);

            // Shell distribution: random point in sphere shell r=[12,55]
            // avoids clustering near the origin
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(Math.random() * 2 - 1);
            const r     = 12 + Math.random() * 43; // 12..55
            const px    = r * Math.sin(phi) * Math.cos(theta);
            const py    = r * Math.sin(phi) * Math.sin(theta) * 0.75; // slightly flatten Y
            const pz    = r * Math.cos(phi) * 0.6 - 10;               // push slightly back

            const { error: dbError } = await supabase.from('archivos').insert([{
                nombre: file.name,
                tipo: file.type || 'application/octet-stream',
                url: publicUrl,
                posicion_x: px,
                posicion_y: py,
                posicion_z: pz,
            }]);


            if (dbError) throw dbError;

            setStatus('UPLOAD COMPLETE');
            setFile(null);
            setTimeout(() => {
                onClose();
                setStatus('');
            }, 2000);

        } catch (err) {
            console.error(err);
            setStatus('UPLOAD FAILED');
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000,
            fontFamily: 'monospace',
            color: '#39FF14'
        }}>
            <div style={{
                border: '2px solid #39FF14',
                padding: '30px',
                width: '400px',
                background: '#0a2912',
                boxShadow: '0 0 15px #39FF14'
            }}>
                <h2 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #39FF14', paddingBottom: '10px' }}>[ UPLOAD_PORTAL ]</h2>

                <form onSubmit={handleUpload}>
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        style={{ marginBottom: '20px', display: 'block', color: '#fff' }}
                        disabled={uploading}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            type="submit"
                            disabled={!file || uploading}
                            style={{
                                background: uploading ? '#555' : '#39FF14',
                                color: '#000',
                                border: 'none',
                                padding: '10px 20px',
                                cursor: file && !uploading ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                fontFamily: 'monospace'
                            }}
                        >
                            {uploading ? 'SUBIENDO...' : 'EJECUTAR'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                color: '#39FF14',
                                border: '1px solid #39FF14',
                                padding: '10px 20px',
                                cursor: 'pointer',
                                fontFamily: 'monospace'
                            }}
                        >
                            CANCELAR
                        </button>
                    </div>
                </form>
                {status && <p style={{ marginTop: '20px', textAlign: 'center' }}>{status}</p>}
            </div>
        </div>
    );
}


