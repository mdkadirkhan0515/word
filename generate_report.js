const fs = require('fs');
const path = require('path');

const outputReport = 'project_code_report.txt';
let reportData = '';

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      reportData += `\n=====================================\n`;
      reportData += `FILE: ${fullPath}\n`;
      reportData += `=====================================\n`;
      reportData += content + '\n';
    }
  });
}

console.log('Generating code report...');
reportData += '=== PROJECT CODE REPORT ===\n';
scanDir(path.join(__dirname, 'src'));
fs.writeFileSync(outputReport, reportData);
console.log(`Report generated successfully as '${outputReport}'!`);
