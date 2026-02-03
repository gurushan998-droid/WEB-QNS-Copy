const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf8').split('\n');

// We want to delete the broken part from line 900 to 917 (assuming 1-based index)
// Line 900 is index 899.
content.splice(899, 18,
    '                </div>',
    '            </div>',
    '        </div>',
    '    `;',
    '}',
    '',
    '/**',
    ' * Helper to trigger MathJax typeset on updated content',
    ' */',
    'function refreshMathJax() {',
    '    if (window.MathJax && window.MathJax.typesetPromise) {',
    '        MathJax.typesetPromise().catch((err) => console.warn(\'MathJax error:\', err));',
    '    }',
    '}'
);

fs.writeFileSync('script.js', content.join('\n'));
console.log('Fixed script.js');
