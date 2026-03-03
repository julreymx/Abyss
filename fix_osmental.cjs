const fs = require('fs');
let content = fs.readFileSync('src/OSMentalAbyss.jsx', 'utf8');
content = content.replace('DisturbedEntity.displayName = "DisturbedEntity";\n\nexport default function OSMentalAbyss()', 'export default function OSMentalAbyss()');
fs.writeFileSync('src/OSMentalAbyss.jsx', content);
