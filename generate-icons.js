const fs = require('fs');
const path = require('path');

// Create a simple SVG-based icon generator
function generateIcon(size, color = '#2563eb') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.1}"/>
  <rect x="${size * 0.15}" y="${size * 0.15}" width="${size * 0.7}" height="${size * 0.7}" fill="white" rx="${size * 0.05}"/>
  <rect x="${size * 0.25}" y="${size * 0.25}" width="${size * 0.5}" height="${size * 0.15}" fill="${color}" rx="${size * 0.02}"/>
  <rect x="${size * 0.25}" y="${size * 0.45}" width="${size * 0.5}" height="${size * 0.15}" fill="${color}" rx="${size * 0.02}"/>
  <rect x="${size * 0.25}" y="${size * 0.65}" width="${size * 0.5}" height="${size * 0.1}" fill="${color}" rx="${size * 0.02}"/>
</svg>`;
}

// Generate icons for all required sizes
const sizes = [72, 96, 128, 144, 152, 384];
const publicDir = path.join(__dirname, 'public');

sizes.forEach(size => {
  const iconPath = path.join(publicDir, `icon-${size}x${size}.png`);
  if (!fs.existsSync(iconPath)) {
    // Create a simple SVG icon and save it
    const svgContent = generateIcon(size);
    const svgPath = path.join(publicDir, `icon-${size}x${size}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`Generated icon-${size}x${size}.svg`);
  }
});

console.log('Icon generation complete!');