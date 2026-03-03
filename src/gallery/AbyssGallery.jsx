import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import FileNode from './FileNode';

export default function AbyssGallery() {
    const [files, setFiles] = useState([]);

    useEffect(() => {
        const fetchFiles = async () => {
            const { data, error } = await supabase
                .from('archivos')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setFiles(data);
            }
        };

        fetchFiles();

        const channel = supabase
            .channel('public:archivos')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archivos' }, payload => {
                setFiles(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <React.Suspense fallback={null}>
            {files.map(file => (
                <FileNode key={file.id} file={file} />
            ))}
        </React.Suspense>
    );
}
