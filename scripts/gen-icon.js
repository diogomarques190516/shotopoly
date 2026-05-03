const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icon.svg');
const outPath = path.join(__dirname, '../assets/icon.png');

const svg = fs.readFileSync(svgPath, 'utf-8');
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } });
const pngData = resvg.render();
const pngBuffer = pngData.asPng();
fs.writeFileSync(outPath, pngBuffer);
console.log('icon.png written —', pngBuffer.length, 'bytes');
