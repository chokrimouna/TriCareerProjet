const fs = require('fs');
const path = require('path');

const directory = 'd:/tricareer/tricareer figma/src/pages';

const replacements = [
  {
    regex: /className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all"/g,
    replace: 'className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift"'
  },
  {
    regex: /className="bg-card border border-border rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer"/g,
    replace: 'className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift cursor-pointer"'
  },
  {
    regex: /className="bg-card rounded-2xl border border-border p-6 shadow-lg"/g,
    replace: 'className="bg-card rounded-[2rem] border border-border p-6 shadow-card hover-lift"'
  },
  {
    regex: /className="bg-card border border-border rounded-2xl p-4 shadow-lg"/g,
    replace: 'className="bg-card border border-border rounded-[2rem] p-4 shadow-card hover-lift"'
  },
  {
    regex: /className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-lg"/g,
    replace: 'className="lg:col-span-2 bg-card rounded-[2rem] border border-border p-6 shadow-card hover-lift"'
  },
  {
    regex: /className="bg-card border border-border rounded-3xl p-8 shadow-sm"/g,
    replace: 'className="bg-card border border-border rounded-[2rem] p-8 shadow-card hover-lift"'
  },
  {
    regex: /className="bg-card border border-border rounded-[2rem] p-6 hover:border-\[#DC2626\] hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"/g,
    replace: 'className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift hover:border-[#DC2626] cursor-pointer group relative overflow-hidden"'
  },
  {
    regex: /className="bg-white border border-border rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group"/g,
    replace: 'className="bg-white border border-border rounded-[2rem] p-6 shadow-card hover-lift cursor-pointer group"'
  },
  {
    regex: /className="bg-white border border-border rounded-2xl p-8 shadow-lg"/g,
    replace: 'className="bg-white border border-border rounded-[2rem] p-8 shadow-card hover-lift"'
  },
  {
    regex: /className="bg-white border border-border rounded-xl p-6 hover:shadow-md transition-all cursor-pointer/g,
    replace: 'className="bg-white border border-border rounded-[2rem] p-6 shadow-card hover-lift cursor-pointer'
  },
  {
    regex: /className="bg-card border border-border rounded-3xl p-6 hover:border-\[#DC2626\]\/50 hover:shadow-2xl transition-all relative group overflow-hidden"/g,
    replace: 'className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift hover:border-[#DC2626]/50 relative group overflow-hidden"'
  }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const { regex, replace } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directory);
console.log("Done.");
