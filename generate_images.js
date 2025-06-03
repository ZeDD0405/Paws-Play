const fs = require('fs');
const path = require('path');

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// Create default profile image
const defaultProfile = `
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#e0e0e0"/>
    <circle cx="100" cy="80" r="40" fill="#9e9e9e"/>
    <path d="M100 140 C60 140 40 160 40 200 L160 200 C160 160 140 140 100 140" fill="#9e9e9e"/>
</svg>`;

// Create default QR code image
const defaultQR = `
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#ffffff"/>
    <rect x="40" y="40" width="120" height="120" fill="#000000"/>
    <rect x="60" y="60" width="40" height="40" fill="#ffffff"/>
    <rect x="100" y="60" width="40" height="40" fill="#ffffff"/>
    <rect x="60" y="100" width="40" height="40" fill="#ffffff"/>
</svg>`;

// Create profile background image
const profileBg = `
<svg width="1200" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="400" fill="#4caf50"/>
    <circle cx="600" cy="200" r="150" fill="#388e3c" opacity="0.3"/>
</svg>`;

// Write the SVG files
fs.writeFileSync(path.join(imagesDir, 'default-profile.svg'), defaultProfile);
fs.writeFileSync(path.join(imagesDir, 'default-qr.svg'), defaultQR);
fs.writeFileSync(path.join(imagesDir, 'profile-bg.svg'), profileBg);

console.log('Default images generated successfully!'); 