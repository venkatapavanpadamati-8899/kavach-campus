const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, '../src'), (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Common Unescaped entities in JSX text
    content = content.replace(/Don't/g, "Don&apos;t");
    content = content.replace(/I'm/g, "I&apos;m");
    content = content.replace(/Let's/g, "Let&apos;s");
    content = content.replace(/It's/g, "It&apos;s");
    content = content.replace(/We're/g, "We&apos;re");
    content = content.replace(/You're/g, "You&apos;re");
    content = content.replace(/We've/g, "We&apos;ve");
    content = content.replace(/you'll/g, "you&apos;ll");
    content = content.replace(/we'll/g, "we&apos;ll");
    content = content.replace(/Can't/g, "Can&apos;t");
    content = content.replace(/can't/g, "can&apos;t");
    content = content.replace(/"/g, (match, offset, str) => {
      // Very naive approach: we only replace " if it's inside a JSX text node, which is hard with regex.
      // So instead we just ignore double quotes for now and fix them manually if needed.
      return match;
    });
    
    // Specifically fix the quote error in settings/page.tsx
    // "Update your emergency contacts, app preferences, and review active sessions."
    content = content.replace(/"Update your emergency contacts/g, "&quot;Update your emergency contacts");
    content = content.replace(/active sessions."/g, "active sessions.&quot;");

    // Also fix the 'initialLat' is never reassigned
    if (filePath.includes('sos\\page.tsx') || filePath.includes('sos/page.tsx')) {
        content = content.replace(/let initialLat/g, "const initialLat");
        content = content.replace(/let initialLng/g, "const initialLng");
        content = content.replace(/let initialAcc/g, "const initialAcc");
    }

    // Fix routingMethod prefer-const
    if (filePath.includes('sos\\route.ts') || filePath.includes('sos/route.ts')) {
        content = content.replace(/let routingMethod/g, "const routingMethod");
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed:', filePath);
    }
  }
});
