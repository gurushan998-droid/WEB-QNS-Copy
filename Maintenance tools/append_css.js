/* 
    FILE: append_css.js
    USE: Node.js utility script.
         Used to programmatically append new CSS rules (specifically for Formula Sheets) 
         to the end of the main 'style.css' file. ADULT USE ONLY during development.
*/
const fs = require('fs');
const css = `
/* Formula Reference Sheet Styles */
.formula-reference-section {
    page-break-before: always;
    margin-top: 50px;
    padding: 30px;
    background: #fff;
    border: 1px solid #ddd;
}

.chapter-formula-block {
    margin-bottom: 30px;
}

.chapter-formula-block h3 {
    font-family: 'Outfit', sans-serif;
    color: var(--color-primary);
    border-bottom: 2px solid var(--color-primary);
    padding-bottom: 5px;
    margin-bottom: 15px;
    font-size: 1.25rem;
}

.formula-reference-section table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Times New Roman', serif;
}

.formula-reference-section th,
.formula-reference-section td {
    border: 1px solid #cbd5e1;
    padding: 12px;
    text-align: left;
}

.formula-reference-section th {
    background-color: #f8fafc;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 0.9rem;
    letter-spacing: 0.05em;
}

.formula-reference-section td:last-child {
    text-align: center;
    font-size: 1.1rem;
}
`;

fs.appendFileSync('style.css', css);
console.log('Appended Formula Sheet styles to style.css');
