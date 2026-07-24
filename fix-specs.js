const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (['chat', 'featured-placements', 'monthly-report', 'withdrawals'].includes(file) && dir === 'src') continue;
            processDir(fullPath);
        } else if (fullPath.endsWith('.spec.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            if (content.includes('.useMocker')) continue;

            content = content.replace(/\}\)\.compile\(\)/, `})
      .useMocker(() => ({}))
      .compile()`);

            fs.writeFileSync(fullPath, content);
            console.log("Fixed", fullPath);
        }
    }
}

processDir('src');
