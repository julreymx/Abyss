const fs = require('fs');
let content = fs.readFileSync('src/OSMentalAbyss.jsx', 'utf8');

if (!content.includes('import AbyssHUD')) {
    content = content.replace(
        "import { useMultiplayer } from './multiplayer/useSockets';",
        "import { useMultiplayer } from './multiplayer/useSockets';\nimport AbyssHUD from './components/AbyssHUD';\nimport AbyssGallery from './gallery/AbyssGallery';\nimport UploadPortal from './gallery/UploadPortal';\nimport { getRecentInfections, limpiarAbismo } from './services/supabase';"
    );
}

// Add state and effect for particle count
if (!content.includes('const [infecciones, setInfecciones]')) {
    content = content.replace(
        "const { socket, otherPlayers } = useMultiplayer();",
        `const { socket, otherPlayers } = useMultiplayer();
    const [infecciones, setInfecciones] = useState([]);
    const [particleCount, setParticleCount] = useState(5000);

    useEffect(() => {
        const init = async () => {
            await limpiarAbismo();
            const recents = await getRecentInfections(5000);
            setInfecciones(recents || []);
        };
        init();
    }, []);

    useEffect(() => {
        setParticleCount(Math.max(0, 5000 - infecciones.length));
    }, [infecciones]);
`
    );
}

// Add HUD, Gallery, Portal
content = content.replace(
    "<AudioAnalyzer setAudioLow={setAudioLow} />",
    `<AudioAnalyzer setAudioLow={setAudioLow} />
            <AbyssHUD particleCount={particleCount} playerCount={Object.keys(otherPlayers).length + 1} />
            <UploadPortal />`
);

content = content.replace(
    "<AggressivePostProcessing />",
    `<AbyssGallery />
                <AggressivePostProcessing />`
);

fs.writeFileSync('src/OSMentalAbyss.jsx', content);
