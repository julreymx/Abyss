const fs = require('fs');
let content = fs.readFileSync('src/OSMentalAbyss.jsx', 'utf8');

// Use React.memo on DisturbedEntity
content = content.replace(
    'const DisturbedEntity = ({ position, rotation, audioLow, videoUrl }) => {',
    'const DisturbedEntity = React.memo(({ position, rotation, audioLow, videoUrl }) => {'
);
content = content.replace(
    /        <\/mesh>\n    \);\n};/g,
    '        </mesh>\n    );\n});\nDisturbedEntity.displayName = "DisturbedEntity";\n'
);

fs.writeFileSync('src/OSMentalAbyss.jsx', content);
