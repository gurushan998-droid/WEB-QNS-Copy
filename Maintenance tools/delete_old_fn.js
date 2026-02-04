/* 
    FILE: delete_old_fn.js
    USE: Node.js utility script.
         Used to remove specific lines (redundant code) from 'script.js'.
         WARNING: This modifies the source code directly.
*/
const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf8').split('\n');

// Delete lines from 865 to 906 (assuming 1-based, adjusted for what I saw)
// In view_file 578: 865 is /**, 868 is function, 904 is }
// We want to delete 865 to 905 (the newline after })
content.splice(864, 906 - 865);

fs.writeFileSync('script.js', content.join('\n'));
console.log('Deleted redundant renderQuestionCard');
