const fs = require('fs');
const file = 'c:/Users/Test1/english-learning-app/src/App.tsx';
let txt = fs.readFileSync(file, 'utf8');
const replacements = [
    ['Ä°', 'İ'], ['Ã–', 'Ö'], ['ÄŸ', 'ğ'], ['Ä±', 'ı'],
    ['ÅŸ', 'ş'], ['Ã§', 'ç'], ['Ã¼', 'ü'], ['Ã‡', 'Ç'],
    ['Ãœ', 'Ü'], ['Ã¶', 'ö'], ['Äž', 'Ğ'], ['Åž', 'Ş']
];
for (const [k, v] of replacements) {
    txt = txt.split(k).join(v);
}
fs.writeFileSync(file, txt, 'utf8');
console.log('App.tsx encoding fixed.');
