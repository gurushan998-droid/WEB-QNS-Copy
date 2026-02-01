/* ==========================================
   Class 12 - Data File
   Merges separate subject data
======================================== */

// Subjects available for Class 12
const class12Subjects = [
    { value: "Botany", label: "Botany" },
    { value: "Zoology", label: "Zoology" }
];

// Chapters organized by subject (Dynamically derived from data files)
const class12Chapters = {
    "Botany": typeof botanyData !== 'undefined' ? Object.keys(botanyData) : [],
    "Zoology": typeof zoologyData !== 'undefined' ? Object.keys(zoologyData) : []
};

// Question Bank for Class 12
const class12QuestionBank = {
    "Botany": typeof botanyData !== 'undefined' ? botanyData : {},
    "Zoology": typeof zoologyData !== 'undefined' ? zoologyData : {}
};

// Common questions (Match and Assertion) for Class 12 - Moved to Individual Chapters
const class12CommonQuestions = {
    match: {
        bb: [],
        interior: []
    },
    assertion: {
        bb: [],
        interior: []
    }
};
