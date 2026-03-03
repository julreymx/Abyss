const fs = require('fs');
let content = fs.readFileSync('src/OSMentalAbyss.jsx', 'utf8');

if (!content.includes('import InfectionTerminal')) {
    content = content.replace(
        "import UploadPortal from './gallery/UploadPortal';",
        "import UploadPortal from './gallery/UploadPortal';\nimport InfectionTerminal from './components/InfectionTerminal';"
    );
}

if (!content.includes('subscribeToInfections')) {
    content = content.replace(
        "import { getRecentInfections, limpiarAbismo } from './services/supabase';",
        "import { getRecentInfections, limpiarAbismo, subscribeToInfections } from './services/supabase';"
    );
}

// Ensure the terminal state exists
if (!content.includes('const [terminalOpen, setTerminalOpen] = useState(false);')) {
    content = content.replace(
        "const [particleCount, setParticleCount] = useState(5000);",
        "const [particleCount, setParticleCount] = useState(5000);\n    const [terminalOpen, setTerminalOpen] = useState(false);\n    const [uploadOpen, setUploadOpen] = useState(false);"
    );
}

// Add real-time listener
if (!content.includes('subscribeToInfections(')) {
    content = content.replace(
        "setInfecciones(recents || []);",
        `setInfecciones(recents || []);

            subscribeToInfections((newInfection) => {
                setInfecciones(prev => [newInfection, ...prev]);
            });`
    );
}

// Add the keydown logic and the buttons
if (!content.includes('e.code === \'KeyI\'')) {
    content = content.replace(
        "useEffect(() => {\n        setParticleCount(Math.max(0, 5000 - infecciones.length));\n    }, [infecciones]);",
        `useEffect(() => {
        setParticleCount(Math.max(0, 5000 - infecciones.length));
    }, [infecciones]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'KeyI' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                setTerminalOpen(v => !v);
            }
            if (e.code === 'KeyU' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                setUploadOpen(v => !v);
            }
            if (e.key === 'Escape') {
                setTerminalOpen(false);
                setUploadOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);`
    );
}

// Add the overlay components and permanent buttons
if (!content.includes('<InfectionTerminal')) {
    content = content.replace(
        "<UploadPortal />",
        `<InfectionTerminal isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />
            <UploadPortal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />

            {/* Botones permanentes en el HUD para invocar las interfaces si el teclado falla */}
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', gap: '20px', zIndex: 50 }}>
                <button
                    onClick={() => setUploadOpen(true)}
                    style={{ background: 'transparent', color: '#39FF14', border: '1px solid #39FF14', padding: '10px 20px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}
                >
                    ◈ SUBIR ARCHIVO
                </button>
                <button
                    onClick={() => setTerminalOpen(true)}
                    style={{ background: '#39FF14', color: '#000', border: 'none', padding: '10px 20px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}
                >
                    INFECTAR EL ABISMO
                </button>
            </div>`
    );
}

fs.writeFileSync('src/OSMentalAbyss.jsx', content);
