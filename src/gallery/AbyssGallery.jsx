import React, { useState, useEffect } from 'react';
import { listGalleryFiles, getGalleryFileUrl } from '../services/api';
import FileNode from './FileNode';

export default function AbyssGallery() {
    const [files, setFiles] = useState([]);

    useEffect(() => {
        const fetchFiles = async () => {
            const data = await listGalleryFiles();
            if (Array.isArray(data)) setFiles(data);
        };

        fetchFiles();

        // Polling for new files (every 10s)
        const interval = setInterval(fetchFiles, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <React.Suspense fallback={null}>
            {files.map(file => (
                <FileNode key={file.id} file={{ ...file, url: getGalleryFileUrl(file.id) }} />
            ))}
        </React.Suspense>
    );
}
