/*
    FILE: fix_tags.js
    USE: Node.js utility script.
         Scans 'script.js' and fixes broken HTML tags (e.g., '< div' -> '<div>') that might have been introduced by auto-formatting or typos.
*/
const fs = require('fs');
let content = fs.readFileSync('script.js', 'utf8');

// Fix common broken HTML tags in strings
content = content.replace(/< div/g, '<div');
content = content.replace(/<\/div >/g, '</div>');
content = content.replace(/< span/g, '<span');
content = content.replace(/<\/span >/g, '</span>');
content = content.replace(/< p/g, '<p');
content = content.replace(/<\/p >/g, '</p>');
content = content.replace(/< button/g, '<button');
content = content.replace(/<\/button >/g, '</button>');
content = content.replace(/< h1/g, '<h1');
content = content.replace(/< h2/g, '<h2');
content = content.replace(/< h3/g, '<h3');
content = content.replace(/< h4/g, '<h4');
content = content.replace(/< h5/g, '<h5');
content = content.replace(/< strong/g, '<strong');
content = content.replace(/<\/strong >/g, '</strong>');
content = content.replace(/< !--/g, '<!--');
content = content.replace(/-- >/g, '-->');
content = content.replace(/< input/g, '<input');
content = content.replace(/< select/g, '<select');
content = content.replace(/<\/select >/g, '</select>');
content = content.replace(/< option/g, '<option');

fs.writeFileSync('script.js', content);
console.log('Fixed script.js tags');
