const fs = require('fs');
const path = require('path');

const targetRegex = /\^\(\?=\.\*\[a-z\]\)\(\?=\.\*\[A-Z\]\)\(\?=\.\*\\d\)\(\?=\.\*\[@\$!%\*\?&\]\)\[A-Za-z\\d@\$!%\*\?&\]\{8,\}\$/g;
const replacement = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$';

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('vendor')) {
                scanDir(fullPath);
            }
        } else if (fullPath.endsWith('.php') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.match(targetRegex)) {
                content = content.replace(targetRegex, replacement);
                fs.writeFileSync(fullPath, content);
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

scanDir('C:/xampp/htdocs/Project 2.2');
