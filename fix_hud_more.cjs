const fs = require('fs');
let content = fs.readFileSync('src/OSMentalAbyss.jsx', 'utf8');

if (!content.includes('GPUFluidParticles')) {
    content = content.replace(
        "import AbyssHUD from './components/AbyssHUD';",
        "import AbyssHUD from './components/AbyssHUD';\nimport GPUFluidParticles from './components/experimental/GPUFluidParticles';"
    );

    content = content.replace(
        "<NauseatingCamera audioLow={audioLow} socket={socket} />",
        "<NauseatingCamera audioLow={audioLow} socket={socket} />\n                <GPUFluidParticles count={particleCount} color=\"#39FF14\" />"
    );
}
fs.writeFileSync('src/OSMentalAbyss.jsx', content);
