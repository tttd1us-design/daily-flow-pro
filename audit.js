const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/app.bundle.js', 'utf8');

const idRegex = /id=["']([^"']+)["']/g;
let match;
const ids = new Set();
while ((match = idRegex.exec(html)) !== null) {
  ids.add(match[1]);
}
console.log(`[HTML IDs]: ${ids.size} unique IDs found.`);

const jsGetIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
const jsIds = new Set();
while ((match = jsGetIdRegex.exec(js)) !== null) {
  jsIds.add(match[1]);
}
console.log(`[JS getElementById]: ${jsIds.size} unique IDs called.`);

const missingInHtml = [...jsIds].filter(id => !ids.has(id));
console.log(`[Missing in HTML]:`, missingInHtml);

// Verify data-target in nav items
const navMatches = [...html.matchAll(/data-tab=["']([^"']+)["']/g)].map(m => m[1]);
console.log(`[Navigation Tabs]:`, navMatches);

const paneMatches = [...html.matchAll(/id=["']pane-([^"']+)["']/g)].map(m => m[1]);
console.log(`[Pane IDs]:`, paneMatches);

const unmappedTabs = navMatches.filter(tab => !paneMatches.includes(tab));
console.log(`[Unmapped Tabs]:`, unmappedTabs);
