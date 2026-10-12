const fs = require('fs');
const path = require('path');

// যে শব্দগুলো খুঁজতে চান বা সন্দেহজনক, সেগুলোর তালিকা এখানে দিন
const targetWords = ['Parrot', 'parrot', 'Carrot', 'carrot']; 

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        targetWords.forEach(word => {
          if (line.includes(word)) {
            console.log(`File: ${fullPath} | Line ${index + 1}: ${line.trim()}`);
          }
        });
      });
    }
  });
}

console.log('Scanning project files for target words...');
scanDir(path.join(__dirname, 'src'));
console.log('Scan completed.');
