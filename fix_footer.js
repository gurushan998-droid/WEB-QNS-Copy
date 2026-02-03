const fs = require('fs');
let content = fs.readFileSync('script.js', 'utf8');

const target = `    // Add Footer
    html += \`
    <div class="paper-footer" style = "text-align: center; margin-top: 20px; font-weight: bold; font-style: italic;" >
        ------- All the best-------
        </div>
    \`;`;

const replacement = `    // --- Added Formula Sheet Feature ---
    const subjectTitle = (document.getElementById('subject')?.value || '').toLowerCase();
    if (subjectTitle.includes('maths') || subjectTitle.includes('mathematics')) {
        let formulaHtml = \`
            <div class="formula-reference-section" style="margin-top: 50px; border-top: 2px solid #333; padding-top: 20px; page-break-before: always;">
                <h2 style="text-align: center; text-decoration: underline; margin-bottom: 20px;">FORMULA REFERENCE SHEET</h2>
        \`;

        let hasFormulas = false;
        selectedChapters.forEach(chapter => {
            const chapterData = questionBank[chapter];
            if (chapterData && chapterData.formulas && chapterData.formulas.length > 0) {
                hasFormulas = true;
                formulaHtml += \`
                    <div class="chapter-formula-block" style="margin-bottom: 25px;">
                        <h3 style="background: #f1f5f9; padding: 5px 10px; border-left: 4px solid var(--color-primary); font-size: 1.1rem; margin-bottom: 10px;">
                            Chapter: \${chapter}
                        </h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; background: white;">
                            <thead>
                                <tr style="background: #f8fafc;">
                                    <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; width: 40%;">Description</th>
                                    <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">Formula</th>
                                </tr>
                            </thead>
                            <tbody>
                \`;
                
                chapterData.formulas.forEach(f => {
                    formulaHtml += \`
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 0.95rem;">\${f.name}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-family: 'Times New Roman'; font-size: 1.1rem;">\${f.eqn}</td>
                        </tr>
                    \`;
                });
                
                formulaHtml += \`
                            </tbody>
                        </table>
                    </div>
                \`;
            }
        });

        if (!hasFormulas) {
             formulaHtml += \`<p style="text-align: center; color: #64748b; font-style: italic;">No specific formulas found for the selected chapters.</p>\`;
        }

        formulaHtml += \`</div>\`;
        html += formulaHtml;
    }

    // Add Footer
    html += \`
        <div class="paper-footer" style="text-align: center; margin-top: 20px; font-weight: bold; font-style: italic;">
            ------- All the best -------
        </div>
    \`;`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('script.js', content);
    console.log('Fixed script.js footer and added formulas');
} else {
    console.log('Target not found');
    // Try a more flexible match
    const flexibleTarget = /\s*\/\/ Add Footer\s*html \+= `\s*<div class="paper-footer"[^>]*>\s*------- All the best-------\s*<\/div>\s*`;/
    if (flexibleTarget.test(content)) {
        content = content.replace(flexibleTarget, replacement);
        fs.writeFileSync('script.js', content);
        console.log('Fixed script.js footer (flexible match)');
    } else {
        console.log('Flexible match also failed');
    }
}
