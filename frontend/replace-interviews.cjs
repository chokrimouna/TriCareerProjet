const fs = require('fs');
const path = require('path');

const filePath = 'd:/tricareer/tricareer figma/src/pages/TeamLeaderInterviews.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/className="bg-card border border-border rounded-2xl p-6"/g, 'className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift"');
content = content.replace(/className="bg-card border border-border rounded-3xl p-6 hover:border-\[#DC2626\]\/50 hover:shadow-2xl transition-all relative group cursor-pointer overflow-hidden flex flex-col h-full"/g, 'className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift hover:border-[#DC2626]/50 relative group cursor-pointer overflow-hidden flex flex-col h-full"');
content = content.replace(/className="relative bg-card border border-border rounded-2xl p-8 w-full max-w-xl shadow-2xl"/g, 'className="relative bg-card border border-border rounded-[2rem] p-8 w-full max-w-xl shadow-card"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated TeamLeaderInterviews.tsx');
