const fs = require('fs');
const path = require('path');

const directory = 'd:/tricareer/tricareer figma/src/pages';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      // Update basic cards with p-6 or p-8 that have hover:shadow
      content = content.replace(/className="([^"]*)bg-card([^"]*)rounded-2xl([^"]*)p-(6|8)([^"]*)hover:shadow-(md|lg|xl|2xl)([^"]*)"/g, 'className="$1bg-card$2rounded-[2rem]$3p-$4$5shadow-card hover-lift$7"');
      content = content.replace(/className="([^"]*)bg-white([^"]*)rounded-2xl([^"]*)p-(6|8)([^"]*)hover:shadow-(md|lg|xl|2xl)([^"]*)"/g, 'className="$1bg-white$2rounded-[2rem]$3p-$4$5shadow-card hover-lift$7"');
      
      // Update cards that have shadow-lg, shadow-xl, shadow-sm but NO hover:shadow
      content = content.replace(/className="([^"]*)bg-card([^"]*)rounded-(2xl|3xl)([^"]*)p-(4|6|8)([^"]*)shadow-(sm|md|lg|xl|2xl)([^"]*)"/g, (match, p1, p2, p3, p4, p5, p6, p7, p8) => {
        // if it already has shadow-card, skip
        if (match.includes('shadow-card')) return match;
        // if it has hover:shadow-, we probably replaced it or want it to be hover-lift
        if (match.includes('hover:shadow')) return match;
        return `className="${p1}bg-card${p2}rounded-[2rem]${p4}p-${p5}${p6}shadow-card hover-lift${p8}"`;
      });

      content = content.replace(/className="([^"]*)bg-white([^"]*)rounded-(2xl|3xl)([^"]*)p-(4|6|8)([^"]*)shadow-(sm|md|lg|xl|2xl)([^"]*)"/g, (match, p1, p2, p3, p4, p5, p6, p7, p8) => {
        if (match.includes('shadow-card')) return match;
        if (match.includes('hover:shadow')) return match;
        return `className="${p1}bg-white${p2}rounded-[2rem]${p4}p-${p5}${p6}shadow-card hover-lift${p8}"`;
      });
      
      // Update TeamLeaderTests and TeamLeaderInterviews specific cards that might not have shadow-*
      content = content.replace(/className="([^"]*)bg-card border border-border rounded-2xl p-6([^"]*)"/g, 'className="$1bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift$2"');
      content = content.replace(/className="([^"]*)bg-white border border-border rounded-2xl p-6([^"]*)"/g, 'className="$1bg-white border border-border rounded-[2rem] p-6 shadow-card hover-lift$2"');
      
      if (originalContent !== content) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directory);
console.log("Done global card replacements.");
