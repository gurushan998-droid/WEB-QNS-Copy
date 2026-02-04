/* ========================================
   +2 Biology Question Paper Generator
   Multi-Tab JavaScript Logic
======================================== */

// ==========================================
// CHAPTER-BASED QUESTION BANK
// ==========================================

// ==========================================
// CONFIGURATION DATA
// Configuration arrays for form dropdowns and question organization
// Data is loaded dynamically based on class selection
// ==========================================

// Standard options for the exam (11th or 12th grade)
// Add more standards here if needed for other grades
const standards = [                                     // Array of available school grades
    { value: "11", label: "11th Standard" },           // Option for Class 11
    { value: "12", label: "12th Standard" }            // Option for Class 12
];

// Current active data - populated based on class selection
let subjects = [];                                    // Holds subject list for selected class
let chapters = [];                                    // Holds chapter list for selected subject
let fullClassData = null;                             // Master container for the selected class
let questionBank = {};                                // Master container for all questions
let commonQuestions = {};                             // Stores widely used standard questions
let papersHistory = [];                               // Stores previously generated papers history
/**
 * Load data for the selected class
 * @param {string} classValue - "11" or "12"
 */

// Login Tab Functions    
function openLoginModal() {
    goToTab(0);
}

function closeLoginModal() {
    // If authenticated, go to first step, otherwise stay on login
    if (auth.currentUser) {
        goToTab(1);
    } else {
        goToTab(0);
    }
}
// Firebase login state-ah monitor pannum
auth.onAuthStateChanged((user) => {
    const mainContent = document.querySelector('.app-main');
    const headerSteps = document.querySelector('.progress-indicator');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userEmailSpan = document.getElementById('userEmail');
    const stepLogin = document.getElementById('stepLogin');

    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const loggedInUserEmail = document.getElementById('loggedInUserEmail');

    if (user) {
        // Login success
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userEmailSpan) {
            userEmailSpan.style.display = 'inline-block';
            userEmailSpan.textContent = user.email;
        }
        if (stepLogin) stepLogin.textContent = "Account";

        // Tab 0 Content Update
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (loggedInUserEmail) loggedInUserEmail.textContent = user.email;

        headerSteps.style.pointerEvents = 'auto';
        console.log("Admin Access Granted: " + user.email);

        // Load user-specific history
        loadHistory();

        // If we are on the Login tab, automatically move to Exam Details
        if (currentTab === 0) {
            goToTab(1);
            // Ensure data is loaded
            const currentStandard = document.getElementById('standard').value;
            if (currentStandard) loadClassData(currentStandard);
        }
    } else {
        // Logged out
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userEmailSpan) userEmailSpan.style.display = 'none';
        if (stepLogin) stepLogin.textContent = "Login";

        // Tab 0 Content Update
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';

        headerSteps.style.pointerEvents = 'none'; // Only allow Tab 0
        if (currentTab !== 0) goToTab(0);
        console.log("Not logged in");

        // Load default/guest history
        loadHistory();
    }
});

// Login function
function handleLogin() {
    const email = document.getElementById('tabLoginEmail').value;
    const pass = document.getElementById('tabLoginPassword').value;
    const loginBtn = document.getElementById('tabLoginBtn');

    if (!email || !pass) {
        alert("Please enter email and password");
        return;
    }

    // Show loading state
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Verifying Credentials...";
    }

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            // Immediate navigation for better UX
            goToTab(1);

            // Ensure data is loaded
            const currentStandard = document.getElementById('standard').value;
            if (currentStandard) loadClassData(currentStandard);

            setTimeout(() => {
                alert("Login Success! Access Granted.");
            }, 200);
        })
        .catch((error) => {
            alert("Login Failed: " + error.message);
            console.error(error);
            // Reset button state on failure
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = "Login";
            }
        });
}

// Logout function
function handleLogout() {
    auth.signOut().then(() => {
        alert("Logged out safely.");
        // No need to reload, onAuthStateChanged will handle it
    });
}
async function loadClassData(standardValue) {
    if (!standardValue) return; // Add check for empty value
    const filePath = `data/class${standardValue}.json`;

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error("File Missing: " + filePath);
        const data = await response.json();

        // Save full data for chapter lookup
        fullClassData = data;

        subjects = data.subjects || [];
        populateSubjectDropdown();

        // If subject was already selected (e.g. from restored state), reload chapters
        const currentSubject = document.getElementById('subject').value;
        if (currentSubject) {
            loadSubjectChapters(currentSubject);
        }
    } catch (error) {
        console.warn("Using Fallback Data:", error);
        fullClassData = null; // Ensure it's null so we don't use stale data
        subjects = [
            { value: "Botany", label: "Botany" },
            { value: "Zoology", label: "Zoology" }
        ];
        populateSubjectDropdown();
    }
}
function loadSubjectChapters(subjectValue) {
    if (!subjectValue) {
        chapters = [];
        populateChapterList();
        return;
    }

    const standard = document.getElementById('standard').value;
    if (!standard) {
        alert("Please select Standard (11th or 12th) first!");
        document.getElementById('subject').value = ""; // Reset subject dropdown
        return;
    }

    // Fast Load: Populate chapters from metadata immediately
    if (fullClassData && fullClassData.chapters && fullClassData.chapters[subjectValue]) {
        console.log("Loading chapters from metadata for:", subjectValue);
        chapters = fullClassData.chapters[subjectValue];
        populateChapterList();
    } else {
        // Fallback for UI if fetch hasn't happened yet
        chapters = [];
        populateChapterList();
    }

    if (standard && subjectValue) {
        fetchQuestions(standard, subjectValue);
    } else {
        console.warn("Standard or Subject missing:", { standard, subjectValue });
    }
}

async function fetchQuestions(standard, subject) {
    const fileName = `${standard}${subject.toLowerCase()}.json`;
    const filePath = `data/${fileName}`;

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error("File not found or access denied: " + filePath);

        const data = await response.json();
        questionBank = data;

        // If chapters weren't loaded from metadata, load them from the file keys
        if (chapters.length === 0) {
            chapters = Object.keys(data);
            populateChapterList();
        }

        saveState();
    } catch (error) {
        console.error("Fetch Error:", error);
        // Show error message in the chapter list area if it's currently empty
        if (chapters.length === 0) {
            const container = document.getElementById('chapterList');
            if (container) {
                container.innerHTML = `<div style="padding: 20px; color: #d32f2f; background: #fee2e2; border-radius: 8px;">
                    <strong>Error loading questions:</strong> ${error.message}<br>
                    <small>Please check if data/${fileName} exists and is valid.</small>
                </div>`;
            }
        }
    }
}
let stateRestoration = false; // Flag to prevent overwriting during loadState

// ... (skipping some lines) ...

function showTab(tabNumber) {                          // Controls visual page switching
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active')); // Hide all panels
    document.getElementById(`tab${tabNumber}`).classList.add('active'); // Show selected panel

    document.querySelectorAll('.progress-step').forEach((step, index) => { // Sync top navigation dots
        step.classList.toggle('active', index === tabNumber); // Highlight current dot
    });

    if (tabNumber === 2) {                             // If moving to Chapters tab...
        populateChapterList();                         // Ensure the grid is up-to-date
    } else if (tabNumber === 3) {                      // If moving to Sections tab...
        renderSections();                              // Draw the Part A/B/C cards
        calculateTotalMarks();                         // Check for marks overflow
    } else if (tabNumber === 4) {                      // If moving to Question Bank...
        renderQuestionSelectionTab();                  // Initialize the picker UI
    }
}

// Redirect tab navigation from progress indicator
function goToTab(tabNumber) {
    currentTab = tabNumber;
    showTab(tabNumber);

    // Populate content if needed
    if (tabNumber === 3) {
        renderSections();
    } else if (tabNumber === 4) {
        renderQuestionSelectionTab();
    } else if (tabNumber === 5) {
        generateFinalPaper();
    }

    // Save state when directly navigating
    saveState();
}

// ==========================================
// STATE MANAGEMENT
// Global variables to track application state
// ==========================================

// ==========================================
// STATE MANAGEMENT
// Global variables to track application state
// ==========================================

// Track which tab is currently active (1-4)
let currentTab = 0;                                  // App starts on Tab 0 (Login)
let currentLineHeight = 1.2;                          // Initial preview line spacing
let pFontSize = 12;                                   // Standard document font size (pt)
let pFontFamily = "'Times New Roman', Times, serif";  // Default academic serif font
let pBold = false;                                    // Bold formatting state
let pItalic = false;                                  // Italic formatting state
let pUnderline = false;                               // Underline formatting state
let pStrike = false;                                  // Strikethrough formatting state
let pSub = false;                                     // Subscript state toggle
let pSup = false;                                     // Superscript state toggle
let pCase = 'none';                                   // Case setting (Normal/UPPER/lower)
let pFontColor = '#000000';                           // Default ink color
let pHighlightColor = '#ffffff';                      // Default paper highlight
let pAlign = 'left';                                  // Default text alignment
let pIndent = 0;                                      // Horizontal offset in pixels
let pBorder = false;                                  // visibility of paper border line

// Array of chapter names that user has selected from Tab 2
let selectedChapters = [];

// Store user-selected questions for manual mode (currently not implemented)
let selectedQuestions = {
    mcq: [],
    shortAnswer: [],
    longAnswer: []
};

// Track current active section in Tab 4
let activeSectionTab = 0;

// Store selected questions per section
// Format: { sectionId: [question objects] }
let sectionQuestions = {};

// Section configuration state
let sections = [];
let sectionCounter = 0;
let activeConfigTab = 0;

// ==========================================
// TAB NAVIGATION
// ==========================================

function nextTab() {
    if (currentTab < 3) {
        // VALIDATION: Check all exam details are filled in Tab 1
        if (currentTab === 1) {
            if (!validateExamDetails()) {
                return; // Don't proceed if validation fails
            }
        }

        // Validate current tab before moving
        if (currentTab === 2 && selectedChapters.length === 0) {
            alert("Please select at least one chapter!");
            return;
        }

        currentTab++;
        showTab(currentTab);
        saveState(); // Persist tab change

    } else if (currentTab === 3) {
        // Final validation before leaving config
        if (!validateMarks()) return;

        currentTab++;
        showTab(currentTab);
        saveState();
        renderQuestionSelectionTab();
    } else if (currentTab === 4) {
        // Handle Section Switching within Tab 4
        if (activeSectionTab < sections.length - 1) {
            // Move to next section
            switchSectionTab(activeSectionTab + 1);
            // We don't save state here necessarily, or we could to remember the active tab?
            // saveState() usually saves everything including activeSectionTab if we tracked it in state
        } else {
            // This was the last section, proceed to Tab 5 (Preview)
            currentTab++;
            showTab(currentTab);
            generateFinalPaper();
            saveState();
        }
    }
}

/**
 * Validate that all exam details fields are filled
 * @returns {boolean} True if all fields are valid, false otherwise
 */
function validateExamDetails() {                     // Ensures first step is complete
    const standard = document.getElementById('standard').value; // Read grade choice
    const subject = document.getElementById('subject').value;   // Read subject choice
    const examName = document.getElementById('examName').value.trim(); // Read paper title
    const examMonth = document.getElementById('examMonth').value.trim(); // Read paper date
    const examTime = document.getElementById('examTime').value.trim(); // Read duration
    const totalMarks = document.getElementById('totalMarks').value; // Read score target

    const missingFields = [];                          // Array to collect error names

    if (!standard) missingFields.push('Standard');      // Check grade existence
    if (!subject) missingFields.push('Subject');        // Check subject existence
    if (!examName) missingFields.push('Exam Name');     // Check title existence
    if (!examMonth) missingFields.push('Month & Year'); // Check date existence
    if (!examTime) missingFields.push('Time Allowed');  // Check duration existence
    if (!totalMarks || totalMarks <= 0) missingFields.push('Total Marks'); // Check marks validity

    if (missingFields.length > 0) {                    // If errors were found...
        alert('*Required Fields Missing:\n\n' + missingFields.map(field => '• ' + field).join('\n') + '\n\nPlease fill all fields before proceeding.'); // Alert user
        return false;                                  // Stop navigation
    }

    return true;                                       // Allow navigation
}

function validateMarks() {
    const examTotalMarks = parseInt(document.getElementById('totalMarks').value) || 0;
    const sectionTotalMarks = sections.reduce((sum, section) => {
        return sum + (section.attemptQuestions * section.marksPerQuestion);
    }, 0);

    if (sectionTotalMarks === 0) {
        alert("Please add at least one section!");
        return false;
    }

    if (examTotalMarks !== sectionTotalMarks) {
        alert(`Error: Total marks mismatch!\n\nExam Details (Tab 1): ${examTotalMarks} marks\nSection Total (Tab 3): ${sectionTotalMarks} marks\n\nPlease adjust your sections or exam total marks to match.`);
        return false;
    }

    return true;
}

function prevTab() {
    if (currentTab === 4 && activeSectionTab > 0) {
        // Move to previous section within Tab 4
        switchSectionTab(activeSectionTab - 1);
    } else if (currentTab > 0) {
        currentTab--;
        showTab(currentTab);
        saveState(); // Save state when going back
    }
}

/**
 * Reset the entire application to start fresh
 */
function createNewPaper() {                         // Full generator reset logic
    if (!confirm("Start a fresh question paper? \n\nThis will Delete ALL current progress, including exam details, sections, and selected questions.")) {
        return;                                        // Exit if user cancels
    }

    const stdSelect = document.getElementById('standard'); // Get grade dropdown el
    const subSelect = document.getElementById('subject');   // Get subject dropdown el
    if (stdSelect) stdSelect.selectedIndex = 0;          // Reset to default option
    if (subSelect) subSelect.selectedIndex = 0;          // Reset to default option

    ['examName', 'examMonth', 'examTime', 'totalMarks'].forEach(id => { // Loop through text fields
        const el = document.getElementById(id);         // Get the element
        if (el) el.value = '';                         // Wipe content clean
    });

    subjects = [];                                     // Reset subject cache
    chapters = [];                                     // Reset chapter cache
    questionBank = {};                                 // Reset Bank data
    commonQuestions = {};                              // Reset header data

    selectedChapters = [];                             // Reset checkbox selections

    sections = [];                                     // Reset Part A/B/C list
    sectionCounter = 0;                                // reset ID counts
    activeConfigTab = 0;                               // Reset focused part

    sectionQuestions = {};                             // Reset all chosen Qs
    activeSectionTab = 0;                              // Reset picker highlight

    populateSubjectDropdown();                         // Re-draw subject list
    populateChapterList();                             // Re-draw chapter grid

    const sectionsContainer = document.getElementById('sectionsContainer'); // Get list container
    if (sectionsContainer) sectionsContainer.innerHTML = ''; // Wipe Part config cards

    document.getElementById('totalMarksCalc').textContent = '0'; // Reset marks display

    currentTab = 1;                                    // Point to start
    showTab(1);                                        // View first tab

    saveState();                                       // Wipe localStorage sync
    loadHistory();                                     // Ensure history remains visible
}

// ==========================================
// STATE PERSISTENCE (LocalStorage)
// ==========================================





// ==========================================
// CHAPTER SELECTION
// ==========================================

function populateStandardDropdown() {
    const select = document.getElementById('standard');
    if (!select) return;

    select.innerHTML = '<option value="">Select Standard</option>' +
        standards.map(std => `<option value="${std.value}">${std.label}</option>`).join('');
}

function populateSubjectDropdown() {
    const subjectSelect = document.getElementById('subject');
    if (!subjectSelect) return;
    subjectSelect.innerHTML = '<option value="">Select Subject</option>' +
        subjects.map(sub => `<option value="${sub.value}">${sub.label}</option>`).join('');
}

function populateChapterList() {                      // Draws checkboxes for Portions Tab
    const container = document.getElementById('chapterList'); // Get the grid container el
    if (!container) return;

    if (!chapters || chapters.length === 0) {
        const std = document.getElementById('standard').value;
        const sub = document.getElementById('subject').value;
        container.innerHTML = `
            <div class="no-chapters-msg" style="padding: 20px; text-align: center; color: #666; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: var(--radius-md); width: 100%;">
                <p>No chapters available yet.</p>
                <p style="font-size: 0.85rem; margin-top: 10px;">
                    Current Status: Standard: ${std || 'None'}, Subject: ${sub || 'None'}
                </p>
                ${(std && sub) ? '<p style="color: var(--color-primary); margin-top: 10px;">Loading data... please wait.</p>' : '<p style="color: #ef4444; margin-top: 10px;">Please go back to Step 1 and select both Standard and Subject.</p>'}
            </div>`;
        return;
    }
    container.innerHTML = chapters.map((chapter, index) => `  
        <div class="chapter-item" onclick="toggleChapterByClick('${chapter}')"> <!-- Card wrapper -->
            <input type="checkbox" id="ch_${chapter.replace(/\s/g, '_')}" value="${chapter}" onchange="toggleChapter('${chapter}')" 
                   ${selectedChapters.includes(chapter) ? 'checked' : ''} onclick="event.stopPropagation()"> <!-- Checkbox with state sync -->
            <label for="ch_${chapter.replace(/\s/g, '_')}">Chapter ${index + 1} - ${chapter}</label> <!-- Label with naming index -->
        </div>
    `).join('');                                     // Join all card strings

    updateSelectAllButton();                         // Refresh the toggle-all text
}

/**
 * Toggle chapter selection when checkbox changes
 * @param {string} chapter - Name of the chapter to toggle
 */
function toggleChapter(chapter) {                       // Logic for single checkbox toggle
    if (selectedChapters.includes(chapter)) {          // If it was already checked...
        selectedChapters = selectedChapters.filter(c => c !== chapter); // Remove from selected list
    } else {                                           // If it was unchecked...
        selectedChapters.push(chapter);                // Append to selected array
    }
    updateSelectAllButton();                           // Re-evaluate global toggle state
    saveState();                                       // Persistence check
}

/**
 * Handle click on chapter card (anywhere on the card, not just checkbox)
 * Makes the entire card clickable for better UX
 * @param {string} chapter - Name of the chapter to toggle
 */
function toggleChapterByClick(chapter) {
    const checkbox = document.getElementById(`ch_${chapter.replace(/\s/g, '_')}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        toggleChapter(chapter);
    }
}

/**
 * Toggle all chapters selection
 */
function toggleSelectAllChapters() {
    // Check if we should select all or deselect all
    // If all current chapters are already selected, then we deselect all
    const allSelected = chapters.length > 0 && chapters.every(ch => selectedChapters.includes(ch));

    if (allSelected) {
        // Deselect all chapters
        selectedChapters = [];
    } else {
        // Select all chapters
        selectedChapters = [...chapters];
    }

    updateSelectAllButton();
    saveState();
    populateChapterList();
}

/**
 * Update the text of the Select All button based on current selection
 */
function updateSelectAllButton() {
    const btn = document.getElementById('selectAllBtn');
    if (!btn || chapters.length === 0) return;

    const allSelected = chapters.length > 0 && chapters.every(ch => selectedChapters.includes(ch));
    btn.innerHTML = allSelected ? '❌ Deselect All' : '✅ Select All';
}

// ... (skipping some lines) ...

function addSection() {                                // Appends a new Part (A, B, C...)
    const examTotalMarks = parseInt(document.getElementById('totalMarks').value) || 0; // Target mark count
    const currentSectionTotal = sections.reduce((sum, section) => { // Sum current configuration
        return sum + (section.attemptQuestions * section.marksPerQuestion); // calculate subtotal
    }, 0);                                             // Start sum at 0

    if (currentSectionTotal >= examTotalMarks && examTotalMarks > 0) { // Limit prevent overlap
        alert('Cannot add more sections!\n\nTotal marks limit reached: ' + examTotalMarks + '\nCurrent section total: ' + currentSectionTotal); // Inform user
        return;                                        // Block addition
    }

    sectionCounter++;                                  // New unique identifier
    const section = {                                  // Data schema for a Paper Part
        id: sectionCounter,                            // Sequence ID
        type: 'MCQ',                                   // Default question format
        maxQuestions: '',                              // Slots to draw
        attemptQuestions: '',                          // Required to answer
        marksPerQuestion: '',                           // Scale of marks
        isOrType: false,                               // Flag for Either/Or questions
        isAndType: false,                               // Flag for Sub-question parts
        marksLevels: [],                                // Filter for 2 mark/3 mark questions
        compulsoryIndex: false                           // Track which question is mandatory
    };

    sections.push(section);                            // Push to global array
    activeConfigTab = sections.length - 1;             // Switch view to new Part
    renderSections();                                  // Update the UI card list
    calculateTotalMarks();                             // Refresh sum display
    saveState();                                       // Sync to memory
}

function removeSection(id) {
    const idx = sections.findIndex(s => s.id === id);
    sections.splice(idx, 1);

    // Adjust active tab if needed
    if (activeConfigTab >= sections.length) {
        activeConfigTab = Math.max(0, sections.length - 1);
    }

    renderSections();
    calculateTotalMarks();
    saveState(); // Persist section removal
}

function updateSection(id, field, value) {
    const section = sections.find(s => s.id === id);
    if (section) {
        if (field === 'name' || field === 'type') {
            section[field] = value;
            if (field === 'type' && value !== 'Long Answer') {
                section.isOrType = false;
                section.isAndType = false;
            }
        } else if (field === 'isOrType') {
            section.isOrType = value;
            if (value) section.isAndType = false; // Mutually exclusive
            if (value && section.maxQuestions) {
                section.attemptQuestions = section.maxQuestions;
            }
        } else if (field === 'isAndType') {
            section.isAndType = value;
            if (value) section.isOrType = false; // Mutually exclusive
        } else {
            // Preserve empty string if input is cleared, otherwise parse as number
            section[field] = value === '' ? '' : (parseInt(value) || 0);

            // Validate attemptQuestions doesn't exceed max safely
            if (field === 'maxQuestions' || field === 'attemptQuestions') {
                const maxVal = section.maxQuestions === '' ? Infinity : parseInt(section.maxQuestions);
                const attemptVal = section.attemptQuestions === '' ? 0 : parseInt(section.attemptQuestions);

                if (attemptVal > maxVal) {
                    section.attemptQuestions = section.maxQuestions;
                }
            }

            // Sync UI inputs if values were clamped
            const attemptInput = document.getElementById(`sec-attempt-${id}`);
            if (attemptInput) {
                if (attemptInput.value !== String(section.attemptQuestions)) {
                    attemptInput.value = section.attemptQuestions;
                }
                if (field === 'maxQuestions') {
                    attemptInput.max = section.maxQuestions;
                }
            }
        }

        // Partial updates to avoid full re-render (focus loss)
        const marksElem = document.getElementById(`section-marks-${id}`);
        if (marksElem) {
            marksElem.textContent = calculateSectionMarks(section);
        }

        calculateTotalMarks();
        saveState();
    }
}

function toggleSectionMark(id, mark) {
    const section = sections.find(s => s.id === id);
    if (!section) return;

    if (!section.marksLevels) section.marksLevels = [];

    const index = section.marksLevels.indexOf(mark);
    if (index > -1) {
        section.marksLevels.splice(index, 1);
    } else {
        section.marksLevels.push(mark);
    }
    saveState();
}

// ==========================================
// TAB 4: QUESTION SELECTION PER SECTION
// ==========================================

/**
 * Render the question selection tab (Tab 4)
 * Creates sub-tabs for each section and question selection interface
 */
function renderQuestionSelectionTab() {
    if (sections.length === 0) {
        alert('No sections configured!');
        return;
    }

    // Calculate start question numbers for each section to show in tabs
    let currentGlobalQNum = 1;
    const sectionStartNums = sections.map(s => {
        const start = currentGlobalQNum;
        const qCount = (sectionQuestions[s.id] || []).filter(q => !q.isPlaceholder).length;
        currentGlobalQNum += qCount;
        return start;
    });

    // Render section tabs
    const tabsContainer = document.getElementById('sectionTabsContainer');
    tabsContainer.innerHTML = sections.map((section, index) => {
        const startQNo = sectionStartNums[index];
        const questions = sectionQuestions[section.id] || [];
        const notice = getCompulsoryNotice(questions, startQNo, section);
        const hasCompulsory = section.compulsoryIndex !== null && section.compulsoryIndex !== undefined;

        return `
            <button class="section-tab ${index === activeSectionTab ? 'active' : ''}" 
                    onclick="switchSectionTab(${index})"
                    style="display: flex; flex-direction: column; align-items: center; gap: 2px; justify-content: center; min-width: 120px;">
                <span style="font-weight: 600;">${romanize(index + 1)}. ${section.name || ''}</span>
                ${hasCompulsory ? `
                    <div style="display: flex; flex-direction: column; align-items: center; line-height: 1;">
                        <span style="font-size: 0.6rem; font-weight: 900; color: #ef4444; letter-spacing: 0.05em;">COMPULSORY</span>
                        ${notice ? `<span style="font-size: 0.65rem; font-weight: 700; color: #ef4444; margin-top: 1px;">Q.${startQNo + section.compulsoryIndex}</span>` : ''}
                    </div>
                ` : ''}
            </button>
        `;
    }).join('');

    // Render questions for active section
    renderSectionQuestions();
}

/**
 * Switch between section tabs in Tab 4
 * @param {number} index - Section index to switch to
 */
function switchSectionTab(index) {
    activeSectionTab = index;
    isBankVisible = false; // Reset bank visibility on tab switch

    // Sync filter with section type
    const section = sections[index];
    if (section) {
        questionFilters.type = section.type;
        questionFilters.chapter = 'all'; // Reset chapter filter too for better UX
        // Sync marks filter with section settings
        if (section.type === 'Short Answer' && section.marksLevels) {
            questionFilters.marks = [...section.marksLevels];
        } else {
            questionFilters.marks = [];
        }
    }

    renderQuestionSelectionTab();

    // Update Button Text Logic
    // Update Button Text Logic
    const nextBtn = document.querySelector('#tab4 .tab-actions .btn-primary');
    const prevBtn = document.querySelector('#tab4 .tab-actions .btn-secondary');

    if (nextBtn) {
        if (activeSectionTab < sections.length - 1) {
            nextBtn.innerText = "Next Section →";
        } else {
            nextBtn.innerText = "Preview Paper →";
        }
    }

    if (prevBtn) {
        if (activeSectionTab > 0) {
            prevBtn.innerText = "← Previous Section";
        } else {
            prevBtn.innerText = "← Previous";
        }
    }
}

/**
 * Render question list for the currently active section
 */
// Current filter state
let questionFilters = {
    chapter: 'all',
    type: 'all',
    source: ['bookBack', 'interior'],
    marks: [],
    searchText: ''
};

// New state for Drag & Drop and Selection
let bankSelection = null;
let draggedItemIndex = null;
let isBankVisible = false;

/**
 * Get all selected question keys from all sections (including nested questions in complex slots)
 * @returns {Set} Set of question identifiers (text) already selected
 */
function getAllSelectedQuestionKeys() {                // Finds all text-based Q IDs in use
    const keys = new Set();                            // Unique storage for text strings

    Object.values(sectionQuestions).forEach(sectionList => { // Loop through every Part's list
        if (!Array.isArray(sectionList)) return;        // safety check for empty data

        sectionList.forEach(q => {                    // Loop through each slot in the Part
            if (!q || q.isPlaceholder) return;         // Skip empty slots

            if (q.mode === 'or' || q.mode === 'and') { // If it's a binary choice slot...
                if (Array.isArray(q.questions)) {       // check for deeper sub-questions
                    q.questions.forEach(subQ => {      // loop through choice A and B
                        if (subQ && !subQ.isPlaceholder) { // if the choice is filled...
                            const key = subQ.q || subQ.assertion || subQ.title; // find display text
                            if (key) keys.add(key);    // mark this text as "already taken"
                        }
                    });
                }
            } else {                                   // Standard single-question slot
                const key = q.q || q.assertion || q.title; // find identifying text
                if (key) keys.add(key);                // mark as "already taken"
            }
        });
    });

    return keys;                                       // Return the global "taken" list
}


/**
 * Helper to trigger MathJax typeset on updated content
 */
function refreshMathJax() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise().catch((err) => console.warn('MathJax error:', err));
    }
}

/**
 * Render question list for the currently active section
 */
function renderSectionQuestions() {
    const section = sections[activeSectionTab];
    if (!section) return;

    if (!sectionQuestions[section.id]) {
        sectionQuestions[section.id] = [];
    }

    const container = document.getElementById('questionSelectionContainer');
    let pool = getQuestionPool(section, true); // forceAll = true to allow switching types
    let filteredPool = filterQuestions(pool);

    // Filter out already selected questions globally (across all sections and nested slots)
    const selectedTexts = getAllSelectedQuestionKeys();
    let availableQuestions = filteredPool.filter(q => {
        const key = q.q || q.assertion || q.title;
        return key && !selectedTexts.has(key);
    });

    // Ensure the question bank is visible
    isBankVisible = true;

    // Calculate starting question number for this section
    const startingNum = getStartingQuestionNumber(activeSectionTab);

    container.innerHTML = `
        <div class="question-manager" >
            <!--Top Controls: Stats-->
            <div class="qm-header">
                <div class="qm-section-info" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: var(--color-bg); padding: 12px 20px; border-radius: var(--radius-md); border-left: 4px solid var(--color-primary);">
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-weight: 700; color: var(--color-primary); margin-right: 10px;">${romanize(activeSectionTab + 1)}.</span>
                            <span style="font-weight: 600; font-size: 1.1rem;">${section.name || 'Unnamed Section'}</span>
                            <button class="btn-icon stats" onclick="renameSectionFromTab4(${section.id})" title="Rename Section" style="margin-left: 10px; opacity: 0.6;">✏️</button>
                            <div style="margin-left: 15px; background: #fee2e2; border-radius: 4px; padding: 2px 8px; font-size: 0.8rem; font-weight: 700; color: #ef4444; display: ${section.compulsoryIndex !== null && section.compulsoryIndex !== undefined ? 'inline-block' : 'none'};">
                                ${getCompulsoryNotice(sectionQuestions[section.id], startingNum, section)}
                            </div>
                        </div>
                        <div style="margin-top: 4px; color: var(--color-text-muted); font-size: 0.9rem;">
                            Select <strong>${section.attemptQuestions}</strong> questions to be attempted. Each carries <strong>${section.marksPerQuestion}</strong> marks.
                        </div>
                    </div>
                    <div class="qm-stats" style="margin-bottom: 0;">
                        <span class="stat-badge ${sectionQuestions[section.id].length === section.maxQuestions ? 'success' : 'warning'}">
                            Questions: ${sectionQuestions[section.id].length} / ${section.maxQuestions}
                        </span>
                    </div>
                </div>
            </div>

            <!--Single Content Area: Question List(Slots)-->
        <div class="qm-body">
            <div class="qm-panel selected-panel" style="width: 100%">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0;">Questions</h4>
                    ${sectionQuestions[section.id].length < section.maxQuestions ?
            `<button class="btn btn-sm btn-outline" onclick="autoFillSection(${section.id})">⚡ Autofill</button>` : ''}
                </div>

                <div class="qm-list" id="selectedList" ondragover="handleDragOver(event)">
                    ${sectionQuestions[section.id].length > 0 ?
            sectionQuestions[section.id].map((q, idx) => renderQuestionCard(q, idx, true, section.id, availableQuestions, startingNum)).join('') :
            '<div class="empty-state">No questions added yet. Click "Add Question" below.</div>'}
                </div>

                <!-- Bottom Buttons -->
                <div class="qm-bottom-actions" style="margin-top: 15px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px;">
                    <div style="display: flex; justify-content: flex-start;">
                        <button class="btn btn-import" onclick="openImportModal()" style="width: auto; padding: 12px 20px; font-size: 0.95rem;">
                            ⬇ Import Question
                        </button>
                    </div>
                    <button class="btn btn-secondary"
                        ${sectionQuestions[section.id].length >= section.maxQuestions ? 'disabled' : ''}
                        onclick="addEmptyQuestionSlot(${section.id})"
                        style="width: auto; padding: 12px 50px;">
                        ➕ Add Question
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;

    // Trigger MathJax after content is injected
    setTimeout(refreshMathJax, 100);
}


/**
 * Automatically fill empty slots and reach max questions using random picks
 * @param {number} sectionId - ID of the section to fill
 */
function autoFillSection(sectionId) {                 // AI-like random picker for empty slots
    const section = sections.find(s => s.id === sectionId); // Get metadata for this part
    if (!section) return;                              // Safety exit

    if (!sectionQuestions[sectionId]) sectionQuestions[sectionId] = []; // Initialize list if missing
    const list = sectionQuestions[sectionId];          // Reference the slot list

    // Temporarily reset global filters to ensure we get all relevant candidates
    const oldFilterType = questionFilters.type;
    questionFilters.type = 'all'; // Hack to bypass UI filter inside getQuestionPool

    let pool = getQuestionPool(section, false);        // Get pool for this section

    questionFilters.type = oldFilterType;              // Restore filter

    if (section.type && section.type !== 'all') {      // Filter pool by Part format
        pool = pool.filter(q => {
            if (section.type === 'MCQ') {
                return q._type === 'MCQ' || q._type === 'Match' || q._type === 'Assertion';
            }
            if (section.type === 'MCQ_Only') {
                return q._type === 'MCQ';
            }
            // Special handling for Short Answer marks filtering
            if (section.type === 'Short Answer' && section.marksLevels && section.marksLevels.length > 0) {
                return (q._type === 'Short Answer') && (q.marks && section.marksLevels.includes(parseInt(q.marks)));
            }
            if (section.type === 'Long Answer' && section.marksLevels && section.marksLevels.length > 0) {
                return (q._type === 'Long Answer') && (q.marks && section.marksLevels.includes(parseInt(q.marks)));
            }
            return q._type === section.type;
        });
    }

    const selectedKeys = getAllSelectedQuestionKeys();  // Find stuff already in the paper

    let candidates = pool.filter(c => {                // Candidates = Pool minus Already Picked
        const key = c.q || c.assertion || c.title;      // find text ID
        return key && !selectedKeys.has(key);          // check if not already used
    });

    candidates = shuffleArray(candidates);             // Randomize the candidates list

    let candidateIdx = 0;                              // Counter for picks

    // First handle existing slots (including nested ones)
    for (let i = 0; i < list.length; i++) {
        const slot = list[i];

        // Skip the compulsory question position - it should not be replaced
        if (section.compulsoryIndex !== null && section.compulsoryIndex !== undefined && i === section.compulsoryIndex) {
            continue;
        }

        if (slot.mode === 'or' && slot.questions) {
            // Fill nested placeholders
            for (let j = 0; j < slot.questions.length; j++) {
                if (slot.questions[j].isPlaceholder && candidateIdx < candidates.length) {
                    slot.questions[j] = JSON.parse(JSON.stringify(candidates[candidateIdx++]));
                }
            }
        } else if (slot.isPlaceholder && candidateIdx < candidates.length) {
            list[i] = JSON.parse(JSON.stringify(candidates[candidateIdx++]));
        }
    }

    // Then add new slots until maxQuestions
    while (list.length < section.maxQuestions && candidateIdx < candidates.length) {
        if (section.isOrType) {
            // Pick two if possible
            if (candidateIdx + 1 < candidates.length) {
                list.push({
                    mode: 'or',
                    questions: [
                        JSON.parse(JSON.stringify(candidates[candidateIdx++])),
                        JSON.parse(JSON.stringify(candidates[candidateIdx++]))
                    ]
                });
            } else {
                break; // Not enough for a full OR pair
            }
        } else if (section.isAndType) {
            // Pick two if possible
            if (candidateIdx + 1 < candidates.length) {
                list.push({
                    mode: 'and',
                    questions: [
                        JSON.parse(JSON.stringify(candidates[candidateIdx++])),
                        JSON.parse(JSON.stringify(candidates[candidateIdx++]))
                    ]
                });
            } else {
                break; // Not enough for a full pair
            }
        } else {
            list.push(JSON.parse(JSON.stringify(candidates[candidateIdx++])));
        }
    }

    if (candidateIdx === 0 && list.length < section.maxQuestions) { // if nothing found
        alert("No more unique questions available in the pool for this section type/chapters!"); // notify user
    }

    saveState();                                       // Persistence check
    renderSectionQuestions();                          // Refresh the UI slots
}

/**
 * Toggle compulsory status for a question position
 * @param {number} sectionId - ID of the section
 * @param {number} idx - Index/position of the question
 */
function toggleCompulsory(sectionId, idx) {
    const sId = Number(sectionId);
    const qIdx = Number(idx);
    const section = sections.find(s => s.id === sId);
    if (!section) return;

    if (!sectionQuestions[sId] || !sectionQuestions[sId][qIdx]) return;

    const question = sectionQuestions[sId][qIdx];

    // Don't allow marking placeholders as compulsory
    if (question.isPlaceholder) {
        alert("Please select a question first before marking it as compulsory.");
        return;
    }

    // Toggle: if this index is already compulsory, remove it; otherwise set it
    if (section.compulsoryIndex === qIdx) {
        section.compulsoryIndex = null; // Remove compulsory
    } else {
        section.compulsoryIndex = qIdx; // Set this position as compulsory
    }

    saveState();

    // Refresh UI
    renderSectionQuestions();

    // Also refresh tabs to reflect compulsory notice if we are in Tab 4
    const tab4 = document.getElementById('tab4');
    if (tab4 && tab4.classList.contains('active')) {
        renderQuestionSelectionTab();
    }
}

/**
 * Remove a question from a section
 * @param {number} sectionId - ID of the section
 * @param {number} idx - Index of the question to remove
 */
function removeQuestion(sectionId, idx) {
    if (!sectionQuestions[sectionId]) return;

    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Remove the question
    sectionQuestions[sectionId].splice(idx, 1);

    // Adjust compulsory index if needed
    if (section.compulsoryIndex !== null && section.compulsoryIndex !== undefined) {
        if (section.compulsoryIndex === idx) {
            // The compulsory question was removed
            section.compulsoryIndex = null;
        } else if (section.compulsoryIndex > idx) {
            // Compulsory question was after the removed one, shift index down
            section.compulsoryIndex--;
        }
    }

    saveState();
    renderSectionQuestions();
}


let activeSlotIndex = null; // Track which slot we are filling

/**
 * Open question bank to change/replace a question at a specific slot
 * Clears compulsory status when user actively changes the question
 */
function openBankForSlot(sectionId, idx) {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Clear compulsory status if this position was marked as compulsory
    // Since user is actively changing the question at this position
    if (section.compulsoryIndex === idx) {
        section.compulsoryIndex = null;
        saveState();
    }

    // Set this as the active slot for replacement
    activeSlotIndex = idx;

    // Show notification
    alert(`Position ${idx + 1} is ready for replacement.Click on a question from the bank below to replace it.`);

    renderSectionQuestions();
}


function addEmptyQuestionSlot(sectionId) {
    const section = sections.find(s => s.id === sectionId);
    if (!sectionQuestions[section.id]) sectionQuestions[section.id] = [];

    if (section.isOrType) {
        // Add a nested OR structure
        sectionQuestions[section.id].push({
            mode: 'or',
            questions: [
                { isPlaceholder: true, label: 'a)' },
                { isPlaceholder: true, label: 'b)' }
            ]
        });
    } else if (section.isAndType) {
        // Add a nested AND structure
        sectionQuestions[section.id].push({
            mode: 'and',
            questions: [
                { isPlaceholder: true, label: 'i)' },
                { isPlaceholder: true, label: 'ii)' }
            ]
        });
    } else {
        // Add a single null/placeholder slot
        sectionQuestions[section.id].push({ isPlaceholder: true });
    }

    // Set as active slot automatically
    activeSlotIndex = sectionQuestions[section.id].length - 1;

    saveState();
    renderSectionQuestions();
}


function addManualToActiveSlot(sectionId) {
    if (activeSlotIndex === null) {
        alert("Please select a slot first!");
        return;
    }
    fillManualSlot(sectionId, activeSlotIndex);
}


function openBankForSlot(sectionId, idx) {
    activeSlotIndex = idx;
    isBankVisible = true;
    bankSelection = null;
    renderSectionQuestions();
}

function confirmFillSlot(sectionId) {
    if (!bankSelection || activeSlotIndex === null) return;

    const list = sectionQuestions[sectionId];
    const qClone = JSON.parse(JSON.stringify(bankSelection));

    if (window.activeInnerSlotIndex !== null && window.activeInnerSlotIndex !== undefined) {
        list[activeSlotIndex].questions[window.activeSubSlotIndex].questions[window.activeInnerSlotIndex] = qClone;
    } else if (window.activeSubSlotIndex !== null && window.activeSubSlotIndex !== undefined) {
        list[activeSlotIndex].questions[window.activeSubSlotIndex] = qClone;
    } else {
        list[activeSlotIndex] = qClone;
    }

    // Reset interaction state
    isBankVisible = false;
    activeSlotIndex = null;
    window.activeSubSlotIndex = null;
    window.activeInnerSlotIndex = null;
    bankSelection = null;

    saveState();
    renderSectionQuestions();
}

function fillManualSlot(sectionId, idx, subIdx = null, innerIdx = null) {
    const text = prompt("Enter Question Text:");
    if (!text) return;

    const section = sections.find(s => s.id === sectionId);
    const newQ = {
        q: text,
        bookBack: false,
        interior: false,
        isCustom: true,
        options: section.type === 'MCQ' ? ["Option A", "Option B", "Option C", "Option D"] : null
    };

    if (!sectionQuestions[sectionId]) sectionQuestions[sectionId] = [];
    const list = sectionQuestions[sectionId];

    if (innerIdx !== null && innerIdx !== undefined) {
        list[idx].questions[subIdx].questions[innerIdx] = newQ;
    } else if (subIdx !== null && subIdx !== undefined) {
        list[idx].questions[subIdx] = newQ;
    } else {
        list[idx] = newQ;
    }

    saveState();
    renderSectionQuestions();
}

function renameSectionFromTab4(sectionId) {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newName = prompt("Enter Section Name:", section.name || "");
    if (newName !== null) {
        section.name = newName;
        saveState();
        renderQuestionSelectionTab(); // Re-render tabs and current view
    }
}

function toggleBank(show) {
    isBankVisible = show;
    renderSectionQuestions();
}

// Helper to get raw pool
function getQuestionPool(section, forceAll = false) {
    let pool = [];

    // 1. Add chapter-specific questions
    selectedChapters.forEach(chapter => {
        const chapterData = questionBank[chapter];
        if (!chapterData) return;

        const tag = (arr, type, source) => arr.map(q => ({
            ...q,
            _chapter: chapter,
            _type: type, // Store original type
            // Ensure bookBack/interior flags are set if missing but implied by the new structure
            bookBack: source === 'bb' ? true : (q.bookBack || false),
            interior: source === 'interior' ? true : (q.interior || false)
        }));

        if (forceAll || section.type === 'MCQ' || section.type === 'MCQ_Only' || questionFilters.type === 'MCQ' || questionFilters.type === 'all') {
            if (chapterData.mcq) {
                if (Array.isArray(chapterData.mcq)) pool = pool.concat(tag(chapterData.mcq, 'MCQ'));
                else {
                    if (chapterData.mcq.bb) pool = pool.concat(tag(chapterData.mcq.bb, 'MCQ', 'bb'));
                    if (chapterData.mcq.interior) pool = pool.concat(tag(chapterData.mcq.interior, 'MCQ', 'interior'));
                }
            }
        }

        if (forceAll || section.type === 'Short Answer' || questionFilters.type === 'Short Answer' || questionFilters.type === 'all') {
            if (chapterData.shortAnswer) {
                let saItems = [];
                if (Array.isArray(chapterData.shortAnswer)) saItems = tag(chapterData.shortAnswer, 'Short Answer');
                else {
                    if (chapterData.shortAnswer.bb) saItems = saItems.concat(tag(chapterData.shortAnswer.bb, 'Short Answer', 'bb'));
                    if (chapterData.shortAnswer.interior) saItems = saItems.concat(tag(chapterData.shortAnswer.interior, 'Short Answer', 'interior'));
                }

                // Apply section-level marks filter if enabled and not forceAll (forceAll is for bank display)
                if (section.marksLevels && section.marksLevels.length > 0 && section.type === 'Short Answer' && !forceAll) {
                    saItems = saItems.filter(q => q.marks && section.marksLevels.includes(parseInt(q.marks)));
                }
                pool = pool.concat(saItems);
            }
        }

        if (forceAll || section.type === 'Long Answer' || questionFilters.type === 'Long Answer' || questionFilters.type === 'all') {
            if (chapterData.longAnswer) {
                if (Array.isArray(chapterData.longAnswer)) pool = pool.concat(tag(chapterData.longAnswer, 'Long Answer'));
                else {
                    if (chapterData.longAnswer.bb) pool = pool.concat(tag(chapterData.longAnswer.bb, 'Long Answer', 'bb'));
                    if (chapterData.longAnswer.interior) pool = pool.concat(tag(chapterData.longAnswer.interior, 'Long Answer', 'interior'));
                }
            }
        }

        // 1d. Add chapter-specific Match questions
        if (forceAll || section.type === 'Match' || questionFilters.type === 'Match' || questionFilters.type === 'all' || section.type === 'MCQ' || questionFilters.type === 'MCQ') {
            if (chapterData.match) {
                if (Array.isArray(chapterData.match)) pool = pool.concat(tag(chapterData.match, 'Match'));
                else {
                    if (chapterData.match.bb) pool = pool.concat(tag(chapterData.match.bb, 'Match', 'bb'));
                    if (chapterData.match.interior) pool = pool.concat(tag(chapterData.match.interior, 'Match', 'interior'));
                }
            }
        }

        // 1e. Add chapter-specific Assertion questions
        if (forceAll || section.type === 'Assertion' || questionFilters.type === 'Assertion' || questionFilters.type === 'all' || section.type === 'MCQ' || questionFilters.type === 'MCQ') {
            if (chapterData.assertion) {
                if (Array.isArray(chapterData.assertion)) pool = pool.concat(tag(chapterData.assertion, 'Assertion'));
                else {
                    if (chapterData.assertion.bb) pool = pool.concat(tag(chapterData.assertion.bb, 'Assertion', 'bb'));
                    if (chapterData.assertion.interior) pool = pool.concat(tag(chapterData.assertion.interior, 'Assertion', 'interior'));
                }
            }
        }
    });

    // 2. Add common questions (Match/Assertion) tagged as 'General' or similar
    const tagCommon = (arr, type, source) => arr.map(q => ({
        ...q,
        _chapter: 'all',
        _type: type,
        bookBack: source === 'bb' ? true : (q.bookBack || false),
        interior: source === 'interior' ? true : (q.interior || false)
    }));

    const processCommon = (commonObj, type) => {
        if (!commonObj) return;
        if (Array.isArray(commonObj)) {
            pool = pool.concat(tagCommon(commonObj, type));
        } else if (typeof commonObj === 'object') {
            if (commonObj.bb) pool = pool.concat(tagCommon(commonObj.bb, type, 'bb'));
            if (commonObj.interior) pool = pool.concat(tagCommon(commonObj.interior, type, 'interior'));
        }
    };

    if (forceAll || section.type === 'MCQ' || section.type === 'Match' || section.type === 'Assertion' || ['MCQ', 'Match', 'Assertion', 'all'].includes(questionFilters.type)) {
        processCommon(commonQuestions.match, 'Match');
        processCommon(commonQuestions.assertion, 'Assertion');
    }

    return pool;
}

// Filter logic
function filterQuestions(pool) {
    return pool.filter(q => {
        // Search text filter - check if search text exists in question content
        if (questionFilters.searchText && questionFilters.searchText.trim() !== '') {
            const searchLower = questionFilters.searchText.toLowerCase().trim();
            let textToSearch = '';

            // Collect all searchable text from the question
            if (q.q) textToSearch += q.q + ' ';
            if (q.assertion) textToSearch += q.assertion + ' ';
            if (q.reason) textToSearch += q.reason + ' ';
            if (q.title) textToSearch += q.title + ' ';
            if (q.options && Array.isArray(q.options)) {
                textToSearch += q.options.join(' ') + ' ';
            }
            if (q.columnA && Array.isArray(q.columnA)) {
                textToSearch += q.columnA.join(' ') + ' ';
            }
            if (q.columnB && Array.isArray(q.columnB)) {
                textToSearch += q.columnB.join(' ') + ' ';
            }

            // Check if search term exists in the collected text
            if (!textToSearch.toLowerCase().includes(searchLower)) return false;
        }

        // Chapter filter
        if (questionFilters.chapter !== 'all' && q._chapter !== questionFilters.chapter && q._chapter !== 'all') return false;

        // Type filter
        if (questionFilters.type && questionFilters.type !== 'all') {
            const t = questionFilters.type;
            let typeMatch = false;
            if (t === 'MCQ') typeMatch = (q._type === 'MCQ' || q._type === 'Match' || q._type === 'Assertion');
            else if (t === 'MCQ_Only') typeMatch = (q._type === 'MCQ');
            else if (t === 'Short Answer') typeMatch = (q._type === 'Short Answer');
            else if (t === 'Long Answer') typeMatch = (q._type === 'Long Answer');
            else if (t === 'Match') typeMatch = (q._type === 'Match');
            else if (t === 'Assertion') typeMatch = (q._type === 'Assertion');

            if (!typeMatch) return false;
        }

        // Source filter - Fixed logic
        const showBB = questionFilters.source.includes('bookBack');
        const showInt = questionFilters.source.includes('interior');

        // If no filters are selected, don't show anything
        if (!showBB && !showInt) return false;

        // If both are selected, show all questions
        if (showBB && showInt) {
            // Proceed to marks filter
        } else if (showBB && !showInt) {
            // If only Book Back is selected, show only book back questions
            if (q.bookBack !== true) return false;
        } else if (showInt && !showBB) {
            // If only Interior is selected, show only interior questions
            if (q.interior !== true) return false;
        }

        // Marks filter (Botany Short Answer Only)
        if (questionFilters.marks.length > 0) {
            const currentSubject = document.getElementById('subject')?.value;
            if (currentSubject === 'Botany' && q._type === 'Short Answer') {
                // If question has NO marks info, we show it IF the user is looking for ANYTHING BUT also filtering?
                // For now, if mark is selected, strict match only IF property exists.
                // If property doesn't exist, we'll exclude it to satisfy the specific filter.
                if (!q.marks || !questionFilters.marks.includes(parseInt(q.marks))) return false;
            }
        }

        return true;
    });
}

function updateQuestionFilter(type, value) {
    // Generic handler
    questionFilters[type] = value;
    renderSectionQuestions();

    // Restore focus to search input if it was the search text being updated
    if (type === 'searchText') {
        setTimeout(() => {
            const newSearchInput = document.querySelector('.inline-filters-sidebar input[type="text"]');
            if (newSearchInput) {
                newSearchInput.focus();
                // Set cursor to the end
                newSearchInput.setSelectionRange(value.length, value.length);
            }
        }, 0);
    }
}

function toggleSourceFilter(source, isChecked) {
    if (isChecked) {
        if (!questionFilters.source.includes(source)) questionFilters.source.push(source);
    } else {
        questionFilters.source = questionFilters.source.filter(s => s !== source);
    }
    renderSectionQuestions();
}

function toggleMarkFilter(mark, isChecked) {
    if (isChecked) {
        if (!questionFilters.marks.includes(mark)) questionFilters.marks.push(mark);
    } else {
        questionFilters.marks = questionFilters.marks.filter(m => m !== mark);
    }

    // Synchronize with section-level config
    const section = sections[activeSectionTab];
    if (section && section.type === 'Short Answer') {
        section.marksLevels = [...questionFilters.marks];
        saveState();
    }

    renderSectionQuestions();
}

function resetQuestionFilters() {
    questionFilters = {
        chapter: 'all',
        type: 'all',
        source: ['bookBack', 'interior'],
        marks: []
    };
    renderSectionQuestions();
}

function getStartingQuestionNumber(currentSectionIndex) {
    let count = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
        // Use maxQuestions (slots) to ensure numbering is consistent with the planned layout
        if (sections[i]) {
            count += (sections[i].maxQuestions || 0);
        }
    }
    return count;
}

function getImgPreview(q, maxWidth = '150px') {
    const imgPath = q.diagram || q.image;
    if (!imgPath) return '';
    const fullImgPath = (imgPath.includes('/') || imgPath.includes('\\')) ? imgPath : `data/picture/${imgPath}`;
    return `<div class="image-preview-box" style="margin-top: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; display: inline-block; background: #fff;">
        <img src="${fullImgPath}" style="max-width: ${maxWidth}; max-height: 120px; display: block; object-fit: contain;" alt="Preview" onerror="this.onerror=null; this.src='https://placehold.co/150x100?text=Image+Missing'">
    </div>`;
}

function renderQuestionCard(q, idx, isSelected, sectionId, availableQuestions = [], startingNum = 0) {
    // Calculate global question number
    const globalQNum = startingNum + idx + 1;
    const mode = q.mode || 'normal';
    const section = sections.find(s => s.id === sectionId);

    // Helper to render the rich active slot UI
    const renderActiveSlotUI = (sId, qIdx, subIdx, labelText, innerIdx = null) => {
        return `
        <div class="q-card active-selection-slot" style = "border: 3px solid var(--color-primary); background: #fff; padding: 0; display: flex; flex-direction: column; min-height: 250px; height: auto; max-height: 60vh; overflow: visible; width: 100%;" >
                <div style="background: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${subIdx !== null ? `
                            <span style="font-weight: 700; color: var(--color-primary); font-family: var(--font-display);">Sub-Question</span>
                            <input type="text" value="${labelText}" 
                                onchange="updateSubSlotLabel(${sId}, ${qIdx}, ${subIdx}, this.value)" 
                                onclick="event.stopPropagation()"
                                style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem; width: 40px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; text-align: center;">
                        ` : `
                            <span style="font-weight: 700; color: var(--color-primary); font-family: var(--font-display);">${globalQNum} - QUESTION SELECTION</span>
                        `}
                        ${innerIdx !== null ? `
                            <span style="font-weight: 800; color: var(--color-accent); font-size: 0.9rem; margin-left: -5px;">- ${['i)', 'ii)', 'iii)', 'iv)'][innerIdx]}</span>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                            <button class="btn-icon mobile-action-btn" style="background: #22c55e; color: white; border: none;" onclick="cancelSelection()" title="Done">✔</button>
                            <button class="btn btn-sm btn-outline mobile-action-btn" style="padding: 6px 15px; background: white; border-color: var(--color-primary); color: var(--color-primary);" onclick="fillManualSlot(${sId}, ${qIdx}, ${subIdx !== null ? subIdx : 'null'}, ${innerIdx !== null ? innerIdx : 'null'})">➕ Manual Input</button>
                            <button class="btn-icon danger mobile-action-btn" onclick="cancelSelection()" title="Cancel selection">✕</button>
                    </div>
                </div>
                
                <div style="display: flex; flex: 1; overflow: hidden;">
                    <!-- Left Sidebar: Filters -->
                    <div class="inline-filters-sidebar" style="width: 250px; background: #fbfbfc; border-right: 1px solid #e2e8f0; padding: 20px; display: flex; flex-direction: column; gap: 20px; flex-shrink: 0; overflow-y: auto;">
                        <!-- Filter: Search by Keywords -->
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Search by Words</label>
                            <input type="text" 
                                   placeholder="Type keywords..." 
                                   value="${questionFilters.searchText || ''}"
                                   oninput="updateQuestionFilter('searchText', this.value)" 
                                   style="padding: 10px; border-radius: var(--radius-sm); border: 1.5px solid var(--color-border); font-family: var(--font-body); font-size: 0.9rem; background: white;">
                        </div>
                        
                        <!-- Filter: Type -->
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Question Type</label>
                            <select onchange="updateQuestionFilter('type', this.value)" style="padding: 10px; border-radius: var(--radius-sm); border: 1.5px solid var(--color-border); font-family: var(--font-body); font-size: 0.9rem; background: white;">
                                <option value="all">All Types</option>
                                <option value="MCQ" ${questionFilters.type === 'MCQ' ? 'selected' : ''}>MCQ (Includes Match & Assertion)</option>
                                <option value="MCQ_Only" ${questionFilters.type === 'MCQ_Only' ? 'selected' : ''}>MCQ (Only)</option>
                                <option value="Match" ${questionFilters.type === 'Match' ? 'selected' : ''}>Match MCQ (Only)</option>
                                <option value="Assertion" ${questionFilters.type === 'Assertion' ? 'selected' : ''}>Assertion MCQ (Only)</option>
                                <option value="Short Answer" ${questionFilters.type === 'Short Answer' ? 'selected' : ''}>Short Answer</option>
                                <option value="Long Answer" ${questionFilters.type === 'Long Answer' ? 'selected' : ''}>Long Answer</option>
                            </select>
                        </div>

                        <!-- Filter: Chapter -->
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Select Chapter</label>
                            <select onchange="updateQuestionFilter('chapter', this.value)" style="padding: 10px; border-radius: var(--radius-sm); border: 1.5px solid var(--color-border); font-family: var(--font-body); font-size: 0.9rem; background: white;">
                                <option value="all">All Lessons</option>
                                ${selectedChapters.map(ch => `<option value="${ch}" ${questionFilters.chapter === ch ? 'selected' : ''}>${ch}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Filter: Source -->
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Source Filter</label>
                            <div style="display: flex; flex-direction: column; gap: 10px; padding: 5px 0;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;">
                                    <input type="checkbox" style="width: 18px; height: 18px;" ${questionFilters.source.includes('bookBack') ? 'checked' : ''} onchange="toggleSourceFilter('bookBack', this.checked)"> Book Back (BB)
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;">
                                    <input type="checkbox" style="width: 18px; height: 18px;" ${questionFilters.source.includes('interior') ? 'checked' : ''} onchange="toggleSourceFilter('interior', this.checked)"> Interior (Int)
                                </label>
                            </div>
                        </div>

                        ${(() => {
                const subjectValue = document.getElementById('subject')?.value;
                if (questionFilters.type === 'Short Answer') {
                    return `
                                    <!-- Filter: Marks -->
                                    <div style="display: flex; flex-direction: column; gap: 6px;">
                                        <label style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Marks Filter</label>
                                        <div style="display: flex; flex-direction: column; gap: 10px; padding: 5px 0;">
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;">
                                                <input type="checkbox" style="width: 18px; height: 18px;" ${questionFilters.marks.includes(2) ? 'checked' : ''} onchange="toggleMarkFilter(2, this.checked)"> 2 Marks (2M)
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;">
                                                <input type="checkbox" style="width: 18px; height: 18px;" ${questionFilters.marks.includes(3) ? 'checked' : ''} onchange="toggleMarkFilter(3, this.checked)"> 3 Marks (3M)
                                            </label>
                                        </div>
                                    </div>
                                `;
                }
                return '';
            })()}
                    </div>

                    <!-- Right Content: Scrollable Question List -->
                    <div class="inline-bank-list" style="flex: 1; padding: 15px; overflow-y: auto; background: #fff;">
                        <div style="margin-bottom: 12px; font-size: 0.8rem; color: #64748b; font-weight: 600;">Found ${availableQuestions.length} Questions</div>
                        ${(() => {
                let lastChapter = null;
                return availableQuestions.length > 0 ?
                    availableQuestions.map(bankQ => {
                        let chapterHeader = '';
                        if (bankQ._chapter !== lastChapter) {
                            lastChapter = bankQ._chapter;
                            chapterHeader = `<div class="bank-chapter-header" style="padding: 10px 15px; background: #f8fafc; font-weight: 700; font-size: 0.85rem; color: var(--color-primary); margin: 20px 0 10px 0; border-radius: var(--radius-sm); border-left: 4px solid var(--color-primary); position: sticky; top: -15px; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">${lastChapter === 'all' ? 'Common / General Questions' : lastChapter}</div>`;
                        }

                        let bankDetail = '';
                        if (bankQ.options) {
                            bankDetail = `<div style="font-size: 0.75rem; color: #777; margin-top: 5px; padding-left: 20px; border-left: 2px solid #f1f5f9;">
                                                        ${bankQ.options.map((opt, i) => `<div>${String.fromCharCode(97 + i)}) ${opt}</div>`).join('')}
                                                    </div>`;
                        } else if (bankQ.columnA) {
                            bankDetail = `<div style="font-size: 0.75rem; color: #777; margin-top: 5px; padding-left: 20px; border-left: 2px solid #f1f5f9;">
                                                        ${bankQ.columnA.map((it, i) => `<div>${it} — ${bankQ.columnB[i]}</div>`).join('')}
                                                    </div>`;
                        }

                        return chapterHeader + `
                                        <div class="q-card bank-card" style="padding: 16px; margin-bottom: 8px; cursor: pointer; border: 1px solid #f1f5f9; border-radius: var(--radius-sm); transition: all 0.2s; display: block;" 
                                            onclick="confirmFillSlotDirectly(${sId}, ${qIdx}, '${btoa(encodeURIComponent(JSON.stringify(bankQ)))}', ${subIdx !== null ? subIdx : 'null'}, ${innerIdx !== null ? innerIdx : 'null'})">
                                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                                <span class="q-badge ${bankQ.bookBack ? 'badge-bb' : 'badge-int'}">${bankQ.bookBack ? 'BB' : 'INT'}</span>
                                                <div style="flex: 1;">
                                                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--color-text); line-height: 1.4;">${bankQ.q || bankQ.assertion || (bankQ.title + ' (Match)')}</div>
                                                    ${getImgPreview(bankQ, '120px')}
                                                    ${bankDetail}
                                                </div>
                                            </div>
                                        </div>
                                    `;
                    }).join('') :
                    '<div class="bank-no-results" style="padding: 40px; text-align: center; color: var(--color-text-muted); background: #f8fafc; border-radius: var(--radius-md); border: 2px dashed var(--color-border); margin: 20px;">' +
                    '   <div style="font-size: 2.5rem; margin-bottom: 15px;">🔍</div>' +
                    '   <div style="font-weight: 700; color: var(--color-text); font-size: 1.1rem; margin-bottom: 8px;">No Matching Questions Found</div>' +
                    '   <p style="font-size: 0.9rem; max-width: 300px; margin: 0 auto 20px auto; line-height: 1.5;">We couldn\'t find any questions matching your current filters. Try selecting more chapters in Tab 2 or relaxing your mark/source filters.</p>' +
                    '   <button class="btn btn-sm btn-primary" onclick="resetQuestionFilters()" style="padding: 10px 20px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Reset All Filters</button>' +
                    '</div>';
            })()}
                    </div>
                </div>
            </div>
        `;
    };

    // RENDER COMPLEX MODES (OR / AND)
    if (mode === 'or' || mode === 'and') {
        const subQs = q.questions || [{ isPlaceholder: true }, { isPlaceholder: true }];

        const renderInnerSubSlot = (innerQ, innerIdx, label, parentSubIdx) => {
            const isEditingInner = window.editingState &&
                window.editingState.idx === idx &&
                window.editingState.subIdx === parentSubIdx &&
                window.editingState.innerIdx === innerIdx;
            const isSelectedInner = activeSlotIndex === idx && window.activeSubSlotIndex === parentSubIdx && window.activeInnerSlotIndex === innerIdx;

            if (isSelectedInner && isBankVisible) {
                return `<div style = "margin: 5px 0;" > ${renderActiveSlotUI(sectionId, idx, parentSubIdx, label, innerIdx)}</div> `;
            }

            if (innerQ.isPlaceholder) {
                return `
        <div class="q-card placeholder-slot" style = "margin-bottom: 4px; padding: 10px; border-style: dashed; width: 100%; cursor: pointer; font-size: 0.85rem;" onclick = "activateSubSlot(${idx}, ${parentSubIdx}, ${innerIdx})" >
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 700; color: var(--color-primary);">${label}</span>
                <span style="color: #94a3b8;">Choose question...</span>
            </div>
            </div> `;
            }

            const qText = innerQ.q || innerQ.assertion || (innerQ.title + (innerQ.columnA ? ' (Match)' : ''));
            return `
        <div class="q-card filled-slot" style = "margin-bottom: 4px; padding: 10px; background: #fff; width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; position: relative;" onclick = "activateSubSlot(${idx}, ${parentSubIdx}, ${innerIdx})" >
            <div style="display: flex; gap: 8px; align-items: flex-start;">
                <span style="font-weight: 700; color: var(--color-primary); font-size: 0.85rem;">${label}</span>
                <div style="flex: 1; padding-right: 70px;">
                    ${isEditingInner ? `
                        <textarea id="edit-q-${idx}-${parentSubIdx}-${innerIdx}" style="width: 100%; height: 50px; padding: 5px; border: 1px solid var(--color-primary); border-radius: 4px; font-size: 0.85rem;" onclick="event.stopPropagation()">${qText}</textarea>
                        <div style="display: flex; gap: 5px; margin-top: 5px;">
                            <button class="btn btn-sm btn-primary" style="padding: 2px 8px; font-size: 0.75rem;" onclick="event.stopPropagation(); window.saveEditedQuestionText()">Save</button>
                            <button class="btn btn-sm btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="event.stopPropagation(); window.cancelEditQuestion()">Cancel</button>
                        </div>
                    ` : `
                        <span style="font-size: 0.85rem; color: #334155; line-height: 1.4;">${qText}</span>
                        ${getImgPreview(innerQ, '100px')}
                    `}
                </div>
            </div>
            ${!isEditingInner ? `
            <div style="position: absolute; top: 5px; right: 5px; display: flex; gap: 3px;">
                <button class="btn-icon" style="width: 22px; height: 22px; font-size: 11px; background: #f1f5f9;" onclick="event.stopPropagation(); window.startEditingQuestion(${sectionId}, ${idx}, ${parentSubIdx}, ${innerIdx})" title="Edit Text">✏️</button>
                <button class="btn-icon" style="width: 22px; height: 22px; font-size: 11px; background: #f1f5f9;" onclick="event.stopPropagation(); activateSubSlot(${idx}, ${parentSubIdx}, ${innerIdx})" title="Replace">↻</button>
                <button class="btn-icon danger" style="width: 22px; height: 22px; font-size: 11px; background: #fee2e2;" onclick="event.stopPropagation(); removeQuestionFromSection(${sectionId}, ${idx}, ${parentSubIdx}, ${innerIdx})" title="Remove">✕</button>
            </div>
            ` : ''
                }
        </div> `;
        };

        const renderSubSlot = (subQ, subIdx, label) => {
            const isActive = (activeSlotIndex === idx && window.activeSubSlotIndex === subIdx && (window.activeInnerSlotIndex === null || window.activeInnerSlotIndex === undefined));

            if (subQ.questions) {
                // RENDER NESTED COMPLEX
                const nestedMode = subQ.mode;
                const partTitle = subQ.q || subQ.assertion || subQ.title || 'Part Title';
                const isEditingTitle = window.editingState && window.editingState.idx === idx && window.editingState.subIdx === subIdx && window.editingState.isPartTitle;

                return `
        <div class="nested-complex-container" style = "width: 100%; margin-bottom: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; position: relative; border-left: 4px solid var(--color-primary);" >
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                             <input type="text" value="${label}" 
                                onchange="window.updateSubSlotLabel(${sectionId}, ${idx}, ${subIdx}, this.value)"
                                style="font-weight: 800; color: var(--color-primary); font-size: 0.9rem; width: 40px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; text-align: center; background: #fff;">
                             <span style="font-weight: 700; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">( ${nestedMode.toUpperCase()} PART )</span>
                        </div>
                        
                        ${isEditingTitle ? `
                            <div style="display: flex; gap: 5px;">
                                <textarea id="edit-part-title-${idx}-${subIdx}" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--color-primary); font-size: 0.9rem; min-height: 40px;">${partTitle}</textarea>
                                <button class="btn btn-sm btn-primary" onclick="savePartTitle(${sectionId}, ${idx}, ${subIdx})">Save</button>
                            </div>
                        ` : `
                            <div style="font-weight: 600; color: #334155; font-size: 0.95rem; cursor: pointer;" onclick="startEditingPartTitle(${idx}, ${subIdx})">${partTitle}</div>
                        `}
                    </div>

                     <div style="display: flex; gap: 4px;">
                        <button class="btn-icon" style="width: 28px; height: 28px; font-size: 14px; background: #fff;" 
                            onclick="event.stopPropagation(); window.toggleModeMenu(${idx}, ${subIdx})" title="Change Mode">ℹ️</button>
                        <button class="btn-icon danger" style="width: 28px; height: 28px; font-size: 14px; background: #fff;" 
                            onclick="event.stopPropagation(); removeQuestionFromSection(${sectionId}, ${idx}, ${subIdx})" title="Remove">✕</button>
                     </div>
                </div>
                
                <div id="mode-menu-${idx}-${subIdx}" class="mode-menu sub-mode-menu" style="display: none; position: absolute; right: 0; top: 40px; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 5px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 135px;">
                     <div style="padding: 8px; cursor: pointer; text-align: left; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9; font-weight: 600;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'normal', ${subIdx})">( Single ) type</div>
                     <div style="padding: 8px; cursor: pointer; text-align: left; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'or', ${subIdx})">( Or ) type</div>
                     <div style="padding: 8px; cursor: pointer; text-align: left; font-size: 0.85rem;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'and', ${subIdx})">( And ) type</div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px; padding-left: 15px; border-left: 2px solid #e2e8f0;">
                    ${subQ.questions.map((innerQ, i) => {
                    const innerLabel = ['a)', 'b)', 'c)', 'd)'][i];
                    return renderInnerSubSlot(innerQ, i, innerLabel, subIdx);
                }).join('')}
                    ${subQ.questions.length < 4 ? `
                        <button class="btn btn-sm btn-outline" style="padding: 8px; font-size: 0.85rem; width: 100%; margin-top: 8px; border-style: dashed; background: #fff; color: #64748b;" onclick="addSubSlot(${sectionId}, ${idx}, ${subIdx})">➕ Add Inner Part</button>
                    ` : ''}
                </div>
            </div> `;
            }

            if (isActive && isBankVisible) {
                return renderActiveSlotUI(sectionId, idx, subIdx, label);
            }

            if (subQ.isPlaceholder) {
                return `
        <div class="q-card placeholder-slot sub-slot-draggable" draggable = "true"
    ondragstart = "handleSubSlotDragStart(event, ${sectionId}, ${idx}, ${subIdx})"
    ondrop = "handleSubSlotDrop(event, ${sectionId}, ${idx}, ${subIdx})"
    ondragover = "handleDragOver(event)"
    style = "margin-bottom: 8px; padding: 15px; border-style: dashed; width: 100%; cursor: move; position: relative;" onclick = "activateSubSlot(${idx}, ${subIdx})" >
                    <div class="q-content" style="flex-direction: row; gap: 10px; padding-right: 40px;">
                        <div class="sub-slot-handle" style="cursor: grab; color: #94a3b8; font-size: 16px; padding-right: 5px;" title="Drag to reorder">⋮⋮</div>
                        <input type="text" value="${label}" 
                            onchange="updateSubSlotLabel(${sectionId}, ${idx}, ${subIdx}, this.value)" 
                            onclick="event.stopPropagation()"
                            style="font-weight: 700; color: var(--color-text-muted); width: 35px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; text-align: center;">
                        <span class="badge-status" style="font-size: 0.8rem;">Tap to select question</span>
                    </div>
                    <div class="q-actions" style="position: absolute; top: 12px; right: 10px; display: flex; flex-direction: row; gap: 4px; padding: 0;">
                        <!-- Mode Menu -->
                        <div style="position: relative;">
                            <button class="btn-icon" style="width: 26px; height: 26px; font-size: 13px; background: #f1f5f9;" 
                                onclick="event.stopPropagation(); window.toggleModeMenu(${idx}, ${subIdx})" title="Change Mode">ℹ️</button>
                            <div id="mode-menu-${idx}-${subIdx}" class="mode-menu sub-mode-menu" style="display: none; position: absolute; right: 0; top: 30px; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 5px; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 125px;">
                                <div style="padding: 5px; cursor: pointer; text-align: left; font-size: 0.85rem; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'normal', ${subIdx})">( Single ) type</div>
                                <div style="padding: 5px; cursor: pointer; text-align: left; font-size: 0.85rem;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'or', ${subIdx})">( Or ) type</div>
                                <div style="padding: 5px; cursor: pointer; text-align: left; font-size: 0.85rem;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'and', ${subIdx})">( And ) type</div>
                            </div>
                        </div>
                        <button class="btn-icon danger" style="width: 26px; height: 26px; font-size: 13px; background: #fee2e2;" onclick="event.stopPropagation(); removeQuestionFromSection(${sectionId}, ${idx}, ${subIdx})" title="Remove">✕</button>
                    </div>
                </div> `;
            }

            // Filled Sub-Question
            const isEditingSub = window.editingState &&
                window.editingState.sectionId === sectionId &&
                window.editingState.idx === idx &&
                window.editingState.subIdx === subIdx;

            const subQuestionText = subQ.q || subQ.assertion || (subQ.title + (subQ.columnA ? ' (Match)' : ''));

            return `
        <div class="q-card filled-slot sub-slot-draggable" draggable = "true"
    ondragstart = "handleSubSlotDragStart(event, ${sectionId}, ${idx}, ${subIdx})"
    ondrop = "handleSubSlotDrop(event, ${sectionId}, ${idx}, ${subIdx})"
    ondragover = "handleDragOver(event)"
    style = "margin-bottom: 8px; padding: 12px; background: #fff; width: 100%; cursor: move; position: relative;" onclick = "activateSubSlot(${idx}, ${subIdx})" >
        <div style="display: flex; gap: 10px;">
            <div class="sub-slot-handle" style="cursor: grab; color: #94a3b8; font-size: 16px; display: flex; align-items: center;" title="Drag to reorder">⋮⋮</div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <input type="text" value="${label}"
                    onchange="updateSubSlotLabel(${sectionId}, ${idx}, ${subIdx}, this.value)"
                    onclick="event.stopPropagation()"
                    style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem; width: 35px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; text-align: center;">
                    <span class="q-badge-mini ${subQ.bookBack ? 'badge-bb' : 'badge-int'}" style="font-size: 0.65rem;">${subQ.bookBack ? 'BB' : 'INT'}</span>
            </div>

            <div style="flex: 1; padding-right: 125px;">
                ${isEditingSub ? `
                            <textarea id="edit-q-${idx}-${subIdx}" style="width: 100%; height: 60px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; font-size: 0.9rem;" onclick="event.stopPropagation()">${subQuestionText}</textarea>
                            ${subQ.options ? `
                                <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 5px;">
                                    ${subQ.options.map((opt, i) => `
                                        <div style="display: flex; gap: 5px; align-items: center;">
                                            <span style="font-weight: 600; font-size: 0.8rem; color: #64748b; width: 20px;">${String.fromCharCode(97 + i)})</span>
                                            <input type="text" class="edit-opt-${idx}-${subIdx}" value="${opt}" style="flex: 1; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.9rem;" onclick="event.stopPropagation()">
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            <div style="display: flex; gap: 8px; margin-top: 8px;">
                                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); window.saveEditedQuestionText()">Save</button>
                                <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); window.cancelEditQuestion()">Cancel</button>
                            </div>
                        ` : `
                            <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px; line-height: 1.4;">${subQuestionText}</div>
                            ${getImgPreview(subQ, '110px')}
                        `}
            </div>

            ${!isEditingSub ? `
                    <div class="q-actions" style="position: absolute; top: 10px; right: 10px; display: flex; flex-direction: row; gap: 4px; padding: 0;">
                        <!-- Mode Menu -->
                        <div style="position: relative;">
                            <button class="btn-icon" style="width: 26px; height: 26px; font-size: 13px; background: #f1f5f9;" 
                                onclick="event.stopPropagation(); window.toggleModeMenu(${idx}, ${subIdx})" title="Change Mode">ℹ️</button>
                            <div id="mode-menu-${idx}-${subIdx}" class="mode-menu sub-mode-menu" style="display: none; position: absolute; right: 0; top: 30px; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 5px; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 125px;">
                                <div style="padding: 5px; cursor: pointer; text-align: left; font-size: 0.85rem; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'normal', ${subIdx})">( Single ) type</div>
                                <div style="padding: 5px; cursor: pointer; text-align: left; font-size: 0.85rem; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'or', ${subIdx})">( Or ) type</div>
                                <div style="padding: 5px; cursor: pointer; text-align: left; font-size: 0.85rem;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'and', ${subIdx})">( And ) type</div>
                            </div>
                        </div>
                        <button class="btn-icon" style="width: 26px; height: 26px; font-size: 13px; background: #f1f5f9;" 
                            onclick="event.stopPropagation(); window.activateSubSlot(${idx}, ${subIdx})" title="Replace">↻</button>
                        <button class="btn-icon" style="width: 26px; height: 26px; font-size: 13px; background: #f1f5f9;" 
                            onclick="event.stopPropagation(); window.startEditingQuestion(${sectionId}, ${idx}, ${subIdx})" title="Edit Text">✏️</button>
                        <button class="btn-icon danger" style="width: 26px; height: 26px; font-size: 13px; background: #fee2e2;" 
                            onclick="event.stopPropagation(); removeQuestionFromSection(${sectionId}, ${idx}, ${subIdx})" title="Remove">✕</button>
                    </div>
                    ` : ''}
        </div>
            </div> `;
        };

        return `
        <div class="q-card complex-slot" draggable = "true" ondragstart = "handleDragStart(event, ${idx})" ondrop = "handleDrop(event, ${idx}, ${sectionId})" ondragover = "handleDragOver(event)" style = "padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; position: relative;" >
            <div class="q-handle" style="top: 10px; left: -15px;">⋮</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="q-num" style="font-size: 1.1rem; color: var(--color-primary);">${globalQNum}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-icon danger" style="width: 28px; height: 28px;" onclick="removeQuestionFromSection(${sectionId}, ${idx})">❌</button>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px; padding-left: 35px;">
                ${subQs.map((subQ, sIdx) => {
            let label = subQ.label;
            if (!label) {
                label = ['i)', 'ii)', 'iii)', 'iv)'][sIdx];
            }
            return `
                        ${sIdx > 0 ? (mode === 'or' ? '<div style="text-align: center; width: 100%; font-weight: 800; color: var(--color-accent); font-size: 0.85rem; margin-top: -2px; margin-bottom: -2px; letter-spacing: 0.05em;">- OR -</div>' : '') : ''}
                        ${renderSubSlot(subQ, sIdx, label)}
                    `;
        }).join('')}

                ${subQs.length < 4 ? `
                    <button class="btn btn-sm btn-outline" style="padding: 10px; font-size: 0.9rem; background: #fff; border: 2px dashed #cbd5e1; color: #64748b; width: 100%; margin-top: 4px; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--color-primary)'; this.style.color='var(--color-primary)';" onmouseout="this.style.borderColor='#cbd5e1'; this.style.color='#64748b';" onclick="window.addSubSlot(${sectionId}, ${idx})">➕ Add Question slot</button>
                ` : ''}
            </div>
        </div>
        `;
    }

    // NORMAL MODE RENDER
    if (isSelected) {
        const isActive = activeSlotIndex === idx;
        if (isActive) {
            // Render Slot with Inline Bank UI
            return renderActiveSlotUI(sectionId, idx, null, null);
        }
    }

    // Placeholder Slot (Normal Mode)
    if (q.isPlaceholder) {
        return `
        <div class="q-card placeholder-slot" onclick = "activeSlotIndex = ${idx}; renderSectionQuestions();" >
            <div class="q-content">
                <span class="q-num" style="font-size: 1.25rem; color: var(--color-primary); font-family: var(--font-display); font-weight: 700;">${globalQNum}</span>
                <span class="badge-status" style="background: var(--color-bg); color: var(--color-text-muted); padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.8rem;">Tap to choose question</span>
            </div>
            <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 5px;">
                <div style="position: relative;">
                    <button class="btn-icon" style="width: 28px; height: 28px; background: #e2e8f0; color: #475569;" onclick="event.stopPropagation(); window.toggleModeMenu(${idx})" title="Change Mode">ℹ️</button>
                    <div id="mode-menu-${idx}" class="mode-menu" style="display: none; position: absolute; right: 0; top: 35px; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 5px; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 150px; text-align: left;">
                        <div style="padding: 5px; cursor: pointer; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'normal')">( Single ) type</div>
                        <div style="padding: 5px; cursor: pointer; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'or')">( Or ) type</div>
                        <div style="padding: 5px; cursor: pointer; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'and')">( And ) type</div>
                        <div style="padding: 5px; cursor: pointer; color: ${(section.compulsoryIndex !== null && section.compulsoryIndex !== undefined && Number(section.compulsoryIndex) === Number(idx)) ? 'var(--color-danger)' : 'var(--color-primary)'}; font-weight: 700;" onclick="event.stopPropagation(); window.toggleCompulsory(${sectionId}, ${idx})">
                            ${(section.compulsoryIndex !== null && section.compulsoryIndex !== undefined && Number(section.compulsoryIndex) === Number(idx)) ? '✓ Compulsory' : 'Mark Compulsory'}
                        </div>
                    </div>
                </div>
                <button class="btn-icon danger" onclick="event.stopPropagation(); removeQuestionFromSection(${sectionId}, ${idx})">❌</button>
            </div>
        </div>
        `;
    }

    // Filled Slot (Normal Mode)
    let detailHtml = '';
    if (q.options) {
        detailHtml = `<div class="slot-details mcq-options" style = "font-size: 0.8rem; color: #666; margin-top: 5px; padding-left: 20px;" >
        ${q.options.map((opt, i) => `<div>${String.fromCharCode(97 + i)}) ${opt}</div>`).join('')}
        </div> `;
    } else if (q.columnA) {
        detailHtml = `<div class="slot-details match-pairs" style = "font-size: 0.8rem; color: #666; margin-top: 5px; padding-left: 20px;" >
        ${q.columnA.map((item, i) => `<div>${item} - ${q.columnB[i]}</div>`).join('')}
        </div> `;
    }

    const isEditing = window.editingState &&
        window.editingState.sectionId === sectionId &&
        window.editingState.idx === idx &&
        (window.editingState.subIdx === null || window.editingState.subIdx === undefined);

    const questionText = q.q || q.assertion || (q.title + ' (Match)');

    return `
        <div class="q-card filled-slot" draggable = "true" onclick = "activeSlotIndex = ${idx}; renderSectionQuestions();" ondragstart = "handleDragStart(event, ${idx})" ondrop = "handleDrop(event, ${idx}, ${sectionId})" ondragover = "handleDragOver(event)" >
        <div class="q-handle" title="Drag to reorder">⋮</div>
        
        <div class="q-num-panel">
            <span class="q-num">${globalQNum}</span>
            <span class="q-badge-mini ${q.bookBack ? 'badge-bb' : 'badge-int'}">${q.bookBack ? 'BB' : 'INT'}</span>
            ${(section.compulsoryIndex !== null && section.compulsoryIndex !== undefined && Number(section.compulsoryIndex) === Number(idx)) ? `<span class="q-badge-mini" style="background: var(--color-danger); color: white; margin-top: 5px; font-size: 0.6rem; padding: 2px 4px;">COMPULSORY</span>` : ''}
        </div>

        <div class="q-text-panel">
            ${isEditing ? `
                <textarea id="edit-q-${idx}" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; font-size: 0.9rem;" onclick="event.stopPropagation()">${questionText}</textarea>
                ${q.options ? `
                    <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 5px;">
                        ${q.options.map((opt, i) => `
                            <div style="display: flex; gap: 5px; align-items: center;">
                                <span style="font-weight: 600; font-size: 0.8rem; color: #64748b; width: 20px;">${String.fromCharCode(97 + i)})</span>
                                <input type="text" class="edit-opt-${idx}" value="${opt}" style="flex: 1; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.9rem;" onclick="event.stopPropagation()">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                     <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); window.saveEditedQuestionText()">Save</button>
                     <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); window.cancelEditQuestion()">Cancel</button>
                </div>
            ` : `
                <div class="q-text">${questionText}</div>
                ${getImgPreview(q, '200px')}
                ${detailHtml}
            `}
        </div>

        <div class="q-actions">
            ${!isEditing ? `
            <!-- Mode Menu -->
             <div style="position: relative; margin-right: 5px;">
                <button class="btn-icon" style="width: 38px; height: 38px;" onclick="event.stopPropagation(); window.toggleModeMenu(${idx})" title="Change Mode">ℹ️</button>
                    <div id="mode-menu-${idx}" class="mode-menu" style="display: none; position: absolute; right: 0; top: 40px; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 5px; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 150px; text-align: left;">
                    <div style="padding: 5px; cursor: pointer; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'normal')">( Single ) type</div>
                    <div style="padding: 5px; cursor: pointer; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'or')">( Or ) type</div>
                    <div style="padding: 5px; cursor: pointer; border-bottom: 1px solid #eee;" onclick="event.stopPropagation(); window.setSlotMode(${sectionId}, ${idx}, 'and')">( And ) type</div>
                    <div style="padding: 5px; cursor: pointer; color: ${(section.compulsoryIndex !== null && section.compulsoryIndex !== undefined && Number(section.compulsoryIndex) === Number(idx)) ? 'var(--color-danger)' : 'var(--color-primary)'}; font-weight: 700;" onclick="event.stopPropagation(); window.toggleCompulsory(${sectionId}, ${idx})">
                        ${(section.compulsoryIndex !== null && section.compulsoryIndex !== undefined && Number(section.compulsoryIndex) === Number(idx)) ? '✓ Compulsory' : 'Mark Compulsory'}
                    </div>
                </div>
            </div>

            <button class="btn-icon" onclick="event.stopPropagation(); activeSlotIndex = ${idx}; renderSectionQuestions();" title="Replace">↻</button>
            <button class="btn-icon" onclick="event.stopPropagation(); window.startEditingQuestion(${sectionId}, ${idx}, null)" title="Edit Text">✏️</button>
            <button class="btn-icon danger" onclick="event.stopPropagation(); removeQuestionFromSection(${sectionId}, ${idx})">❌</button>
            ` : ''}
        </div>
    </div>
        `;
}

function cancelSelection() {
    activeSlotIndex = null;
    renderSectionQuestions();
}

function confirmFillSlotDirectly(sectionId, idx, qString, subIdx = null, innerIdx = null) {
    try {
        const q = JSON.parse(decodeURIComponent(atob(qString)));
        const list = sectionQuestions[sectionId];

        if (innerIdx !== null && innerIdx !== 'null') {
            if (list[idx] && list[idx].questions && list[idx].questions[subIdx] && list[idx].questions[subIdx].questions) {
                const existingLabel = list[idx].questions[subIdx].questions[innerIdx].label;
                list[idx].questions[subIdx].questions[innerIdx] = q;
                if (existingLabel) list[idx].questions[subIdx].questions[innerIdx].label = existingLabel;
            }
        } else if (subIdx !== null && subIdx !== 'null') {
            if (list[idx] && list[idx].questions) {
                const existingLabel = list[idx].questions[subIdx].label;
                list[idx].questions[subIdx] = q;
                if (existingLabel) list[idx].questions[subIdx].label = existingLabel;
            }
        } else {
            list[idx] = q;
        }

        activeSlotIndex = null;
        window.activeSubSlotIndex = null;
        window.activeInnerSlotIndex = null;
        saveState();
        renderSectionQuestions();
    } catch (e) {
        console.error("Error filling slot:", e);
    }
}

// Drag & Drop Handlers
function handleDragStart(e, index) {
    draggedItemIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, targetIndex, sectionId) {
    e.preventDefault();
    const list = sectionQuestions[sectionId];

    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    // Remove dragged item
    const [movedItem] = list.splice(draggedItemIndex, 1);
    // Insert at new position
    list.splice(targetIndex, 0, movedItem);

    // Reset and Render
    draggedItemIndex = null;
    saveState();
    renderSectionQuestions();
}

// Sub-slot Drag & Drop Handlers for reordering within complex question cards
let draggedSubSlotData = null; // { sectionId, qIdx, subIdx }

function handleSubSlotDragStart(e, sectionId, qIdx, subIdx) {
    e.stopPropagation(); // Prevent parent card from being dragged
    draggedSubSlotData = { sectionId, qIdx, subIdx };
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
    e.target.style.opacity = '0.5';
}

function handleSubSlotDrop(e, sectionId, qIdx, targetSubIdx) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSubSlotData) return;

    // Only allow reordering within the same complex question
    if (draggedSubSlotData.sectionId !== sectionId || draggedSubSlotData.qIdx !== qIdx) {
        draggedSubSlotData = null;
        return;
    }

    const sourceSubIdx = draggedSubSlotData.subIdx;
    if (sourceSubIdx === targetSubIdx) {
        draggedSubSlotData = null;
        return;
    }

    // Get the questions array for this complex slot
    const complexQ = sectionQuestions[sectionId][qIdx];
    if (!complexQ || !complexQ.questions) {
        draggedSubSlotData = null;
        return;
    }

    const subQs = complexQ.questions;

    // Swap the sub-questions
    const [movedSubQ] = subQs.splice(sourceSubIdx, 1);
    subQs.splice(targetSubIdx, 0, movedSubQ);

    // Update labels after reorder
    const mode = complexQ.mode;
    subQs.forEach((sq, i) => {
        if (mode === 'or') {
            sq.label = String.fromCharCode(97 + i) + ')';
        } else {
            sq.label = ['i)', 'ii)', 'iii)', 'iv)'][i];
        }
    });

    // Reset and render
    draggedSubSlotData = null;
    saveState();
    renderSectionQuestions();
}

// Add dragend event to reset state
document.addEventListener('dragend', function (e) {
    if (e.target.classList.contains('sub-slot-draggable')) {
        e.target.style.opacity = '1';
        e.target.classList.remove('dragging');
    }
    draggedSubSlotData = null;
});


function selectBankQuestion(qString) {
    try {
        const q = JSON.parse(decodeURIComponent(atob(qString)));
        bankSelection = q;
        renderSectionQuestions();
    } catch (e) { console.error(e); }
}

function confirmAddQuestion(sectionId) {
    if (!bankSelection) return;
    const section = sections.find(s => s.id === sectionId);
    if (!sectionQuestions[sectionId]) sectionQuestions[sectionId] = [];
    if (sectionQuestions[sectionId].length >= section.maxQuestions) {
        alert(`Maximum ${section.maxQuestions} questions reached!`);
        return;
    }
    const qClone = JSON.parse(JSON.stringify(bankSelection));
    sectionQuestions[sectionId].push(qClone);
    bankSelection = null;
    saveState();
    renderSectionQuestions();
}

function addQuestionToSection(sectionId, qString) {
    // Legacy support redirect
    selectBankQuestion(qString);
}

function removeQuestionFromSection(sectionId, idx, subIdx = null, innerIdx = null) {
    if (sectionQuestions[sectionId]) {
        const list = sectionQuestions[sectionId];
        if (innerIdx !== null && innerIdx !== undefined) {
            // Nested inner-slot removal
            if (list[idx] && list[idx].questions && list[idx].questions[subIdx] && list[idx].questions[subIdx].questions) {
                list[idx].questions[subIdx].questions[innerIdx] = { isPlaceholder: true };
                const labels = ['a)', 'b)', 'c)', 'd)'];
                list[idx].questions[subIdx].questions[innerIdx].label = labels[innerIdx];
            }
        } else if (subIdx !== null && subIdx !== undefined) {
            // Complex question sub-slot reset
            if (list[idx] && list[idx].questions) {
                list[idx].questions[subIdx] = { isPlaceholder: true };
                const labels = ['i)', 'ii)', 'iii)', 'iv)'];
                list[idx].questions[subIdx].label = labels[subIdx];
            }
        } else {
            // Normal section slot removal
            list.splice(idx, 1);

            // Shift compulsory index logic
            const section = sections.find(s => s.id === Number(sectionId));
            if (section && section.compulsoryIndex !== null && section.compulsoryIndex !== undefined) {
                if (Number(section.compulsoryIndex) === Number(idx)) {
                    section.compulsoryIndex = null;
                } else if (Number(section.compulsoryIndex) > Number(idx)) {
                    section.compulsoryIndex--;
                }
            }
        }
        saveState();
        renderSectionQuestions();

        // Refresh tabs to update compulsory notice
        const tab4 = document.getElementById('tab4');
        if (tab4 && tab4.classList.contains('active')) {
            renderQuestionSelectionTab();
        }
    }
}

window.addSubSlot = function (sectionId, idx, subIdx = null) {
    const list = sectionQuestions[sectionId];
    if (list && list[idx]) {
        const q = (subIdx !== null && subIdx !== undefined) ? list[idx].questions[subIdx] : list[idx];
        if (!q.questions) q.questions = [{ isPlaceholder: true }, { isPlaceholder: true }];

        if (q.questions.length < 4) {
            const nextIdx = q.questions.length;
            const label = (subIdx !== null) ? ['a)', 'b)', 'c)', 'd)'][nextIdx] : ['i)', 'ii)', 'iii)', 'iv)'][nextIdx];
            q.questions.push({ isPlaceholder: true, label: label });
            saveState();
            renderSectionQuestions();
        }
    }
};

function editQuestion(sectionId, idx) {
    const q = sectionQuestions[sectionId][idx];
    const newText = prompt("Edit Question Text:", q.q || q.assertion || q.title);

    if (newText !== null && newText.trim() !== "") {
        if (q.q) q.q = newText;
        else if (q.assertion) q.assertion = newText;
        else if (q.title) q.title = newText;

        saveState();
        renderSectionQuestions();
    }
}

function addManualQuestion(sectionId) {
    const section = sections.find(s => s.id === sectionId);
    if (sectionQuestions[sectionId] && sectionQuestions[sectionId].length >= section.maxQuestions) {
        alert("Section is full!");
        return;
    }

    const text = prompt("Enter Custom Question Text:");
    if (!text) return;

    const newQ = {
        q: text,
        bookBack: false,
        interior: false, // Custom
        isCustom: true,
        options: section.type === 'MCQ' ? ["Option A", "Option B", "Option C", "Option D"] : null
    };

    if (!sectionQuestions[sectionId]) sectionQuestions[sectionId] = [];
    sectionQuestions[sectionId].push(newQ);
    saveState();
    renderSectionQuestions();
}

// Removed duplicate autoFillSection

/**
 * Auto-generate questions for a specific section
 * @param {number} sectionIndex - Index of the section to generate
 */
function autoGenerateSection(sectionIndex) {
    alert(`Auto - generate for Section ${romanize(sectionIndex + 1)} - Coming soon!`);
}

// Removed duplicate sections logic

function calculateSectionMarks(section) {
    const attempt = section.attemptQuestions === "" ? 0 : parseInt(section.attemptQuestions);
    const marks = section.marksPerQuestion === "" ? 0 : parseInt(section.marksPerQuestion);
    return `(${section.attemptQuestions || 0} x ${section.marksPerQuestion || 0} = ${attempt * marks})`;
}

function renderSections() {
    const container = document.getElementById('sectionsContainer');
    if (!container) return;

    if (sections.length === 0) {
        container.innerHTML = '<div class="empty-state">No sections added. Click "Add Section" to begin.</div>';
        return;
    }

    // Save scroll position of the main content area
    const scrollArea = document.querySelector('.app-main');
    const scrollPos = scrollArea ? scrollArea.scrollTop : 0;
    const activeId = document.activeElement ? document.activeElement.id : null;

    container.innerHTML = sections.map((section, sectionIdx) => {
        return `
    <div class="section-card" draggable = "true"
ondragstart = "handleSectionDragStart(event, ${sectionIdx})"
ondragover = "handleSectionDragOver(event)"
ondrop = "handleSectionDrop(event, ${sectionIdx})" >
            <div class="section-drag-handle">⋮⋮</div>
            <button class="remove-section-btn" onclick="removeSection(${section.id})" title="Remove Section">×</button>
            <div class="section-header-row">
                <div class="section-number">Section ${romanize(sectionIdx + 1)}</div>
                <div class="section-marks" id="section-marks-${section.id}">${calculateSectionMarks(section)}</div>
            </div>
            <div class="section-config">
                <div class="config-field" style="grid-column: span 2;">
                    <label>Section Name</label>
                    <input type="text" value="${section.name || ''}" 
                           placeholder="e.g. Part I - Answer all"
                           oninput="updateSection(${section.id}, 'name', this.value)">
                </div>
                <div class="config-field" style="grid-column: span 1.5;">
                    <label>Question Type</label>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <select onchange="updateSection(${section.id}, 'type', this.value); renderSections();" style="width: 100%;">
                            <option value="MCQ" ${section.type === 'MCQ' ? 'selected' : ''}>MCQ (Includes Match & Assertion)</option>
                            <option value="MCQ_Only" ${section.type === 'MCQ_Only' ? 'selected' : ''}>MCQ (Only)</option>
                            <option value="Match" ${section.type === 'Match' ? 'selected' : ''}>Match MCQ (Only)</option>
                            <option value="Assertion" ${section.type === 'Assertion' ? 'selected' : ''}>Assertion MCQ (Only)</option>
                            <option value="Short Answer" ${section.type === 'Short Answer' ? 'selected' : ''}>Short Answer</option>
                            <option value="Long Answer" ${section.type === 'Long Answer' ? 'selected' : ''}>Long Answer</option>
                        </select>
                        
                        ${(section.type === 'Short Answer') ? `
                        <div style="display: flex; gap: 15px; background: #fff; padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
                            <label style="display: flex; align-items: center; gap: 5px; margin-bottom: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                                <input type="checkbox" ${(section.marksLevels && section.marksLevels.includes(2)) ? 'checked' : ''} 
                                       onchange="toggleSectionMark(${section.id}, 2); renderSections();" style="width: 16px; height: 16px;"> 2 Mark
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px; margin-bottom: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                                <input type="checkbox" ${(section.marksLevels && section.marksLevels.includes(3)) ? 'checked' : ''} 
                                       onchange="toggleSectionMark(${section.id}, 3); renderSections();" style="width: 16px; height: 16px;"> 3 Mark
                            </label>
                        </div>
                        ` : ''}
                        
                        ${(section.type === 'Long Answer') ? `
                        <div style="display: flex; gap: 15px; background: #fff; padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
                            <label style="display: flex; align-items: center; gap: 5px; margin-bottom: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                                <input type="checkbox" ${section.isOrType ? 'checked' : ''} onchange="updateSection(${section.id}, 'isOrType', this.checked); renderSections();" style="width: 16px; height: 16px;"> Or type
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px; margin-bottom: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                                <input type="checkbox" ${section.isAndType ? 'checked' : ''} onchange="updateSection(${section.id}, 'isAndType', this.checked); renderSections();" style="width: 16px; height: 16px;"> And type
                            </label>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="config-field">
                    <label>Maximum Questions</label>
                    <input type="number" id="sec-max-${section.id}" min="1" value="${section.maxQuestions}" 
                           oninput="updateSection(${section.id}, 'maxQuestions', this.value)">
                </div>
                <div class="config-field">
                    <label>Questions to Attempt</label>
                    <input type="number" id="sec-attempt-${section.id}" min="1" max="${section.maxQuestions}" value="${section.attemptQuestions}" 
                           oninput="updateSection(${section.id}, 'attemptQuestions', this.value)">
                </div>
                <div class="config-field">
                    <label>Marks per Question</label>
                    <input type="number" id="sec-marks-${section.id}" min="1" value="${section.marksPerQuestion}" 
                           oninput="updateSection(${section.id}, 'marksPerQuestion', this.value)">
                </div>
            </div>
        </div>
    `;
    }).join('');

    // Restore scroll position
    if (scrollArea) scrollArea.scrollTop = scrollPos;
    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.focus();
    }
}


function calculateTotalMarks() {
    const total = sections.reduce((sum, section) => {
        const attempt = section.attemptQuestions === "" ? 0 : parseInt(section.attemptQuestions);
        const marks = section.marksPerQuestion === "" ? 0 : parseInt(section.marksPerQuestion);
        return sum + (attempt * marks);
    }, 0);

    // Update the display in Tab 3 only (not Tab 1 input)
    const elem = document.getElementById('totalMarksCalc');
    if (elem) elem.textContent = total;
}

// Section Drag & Drop Logic
let draggedSectionIndex = null;

function handleSectionDragStart(e, index) {
    draggedSectionIndex = index;
    // We add the class to a timeout to allow the ghost image to be created from the original state
    setTimeout(() => {
        e.target.classList.add('dragging');
    }, 0);
}

function handleSectionDragOver(e) {
    e.preventDefault();
}

function handleSectionDrop(e, targetIndex) {
    e.preventDefault();

    // Remove the 'dragging' class from all cards
    document.querySelectorAll('.section-card').forEach(card => card.classList.remove('dragging'));

    if (draggedSectionIndex === null || draggedSectionIndex === targetIndex) return;

    // Move section in the array
    const movedSection = sections.splice(draggedSectionIndex, 1)[0];
    sections.splice(targetIndex, 0, movedSection);

    draggedSectionIndex = null;

    // Refresh UI
    renderSections();
    calculateTotalMarks();

    // Sync with Tab 4 if needed
    if (typeof renderQuestionSelectionTab === 'function') {
        renderQuestionSelectionTab();
    }

    saveState();
}


// ==========================================
// QUESTION SELECTION
// ==========================================

function populateQuestionSelectors() {
    // Get questions from selected chapters
    let availableMCQ = [];
    let availableShort = [];
    let availableLong = [];

    selectedChapters.forEach(chapter => {
        const chapterData = questionBank[chapter];
        if (chapterData) {
            availableMCQ = availableMCQ.concat(chapterData.mcq);
            availableShort = availableShort.concat(chapterData.shortAnswer);
            availableLong = availableLong.concat(chapterData.longAnswer);
        }
    });

    // Populate section 1 (MCQs + Match + Assertion) - simplified for now
    document.getElementById('section1Selector').innerHTML = `
    <p >📌 Section I will auto - select 4 MCQs + 2 Match + 2 Assertion(8 questions)</p>
        `;

    // Populate section 2 (Short answer)
    document.getElementById('section2Selector').innerHTML = `
        <p >📌 Section II will auto - select 6 questions(answer any 4)</p>
            `;

    // Populate section 3
    document.getElementById('section3Selector').innerHTML = `
            <p >📌 Section III will auto - select 5 questions(answer any 3, Q19 compulsory)</p>
                `;

    // Populate section 4
    document.getElementById('section4Selector').innerHTML = `
                <p >📌 Section IV will auto - select 2 questions with OR options</p>
                    `;
}

// ==========================================
// PAPER GENERATION
// ==========================================

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function pickRandom(array, count) {
    return shuffleArray(array).slice(0, Math.min(count, array.length));
}

function generateMatchOptions(correctArr) {
    const options = [];
    const correctStr = correctArr.map((v, i) => `${['i', 'ii', 'iii', 'iv'][i]} - ${v} `).join(', ');

    const fakes = new Set();
    while (fakes.size < 3) {
        if (JSON.stringify(shuffled) !== JSON.stringify(correctArr)) {
            fakes.add(shuffled.map((v, i) => `${['i', 'ii', 'iii', 'iv'][i]} - ${v} `).join(', '));
        }
    }

    options.push(correctStr);
    fakes.forEach(f => options.push(f));

    return shuffleArray(options);
}

function generateFinalPaper() {                     // Main engine to build the printable sheet
    const examName = document.getElementById('examName').value.toUpperCase(); // Get uppercase title
    const examMonth = document.getElementById('examMonth').value;            // Get test date
    const examTime = document.getElementById('examTime').value;              // Get duration
    const totalMarks = document.getElementById('totalMarks').value;          // Get total score
    const subject = document.getElementById('subject').value.toUpperCase();  // Get uppercase subject
    const standardValue = document.getElementById('standard').value;          // Get class ID

    const standardLabel = standardValue + " - STD";    // Formatted class label for header

    let html = `                                       <!--Start building HTML string-->
    <!-- 
       PRINT PREVIEW HEADER SECTION 
       (Starts here)
    -->
    <header class="paper-header">                     <!-- Visual header for the sheet -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 8px; padding-top: 5px;">
                <div class="reg-no-wrapper">          <!-- Student ID box section -->
                    <span class="reg-no-label">Reg.No :</span> <!-- Input prompt -->
                    <div class="reg-no-grid">         <!-- Row of boxes -->
                        <div class="reg-no-box"></div> <!-- Single digit box -->
                        <div class="reg-no-box"></div> <!-- Single digit box -->
                        <div class="reg-no-box"></div> <!-- Single digit box -->
                        <div class="reg-no-box"></div> <!-- Single digit box -->
                        <div class="reg-no-box"></div> <!-- Single digit box -->
                        <div class="reg-no-box"></div> <!-- Single digit box -->
                    </div>
                </div>
            </div>
            <h1 class="exam-title">${examName}</h1>    <!-- Main paper title heading -->
            <div class="paper-meta">                  <!-- Middle metadata row -->
                <div class="meta-left">               <!-- Left info block -->
                    <p><strong>${standardLabel}</strong></p> <!-- Class info -->
                    <p>Time: ${examTime}</p>           <!-- duration info -->
                </div>
                <div class="meta-center">             <!-- Center info block -->
                    <h2>${subject}</h2>               <!-- Large Subject title -->
                </div>
                <div class="meta-right">              <!-- Right info block -->
                    <p>Marks: ${totalMarks}</p>       <!-- Target score info -->
                </div>
            </div>
    </header>
    <section class="paper-content">
        `;

    // Generate Sections based on configuration
    let currentGlobalQNum = 1;

    sections.forEach((section, index) => {
        let pool = getQuestionPool(section);
        const manualQuestions = sectionQuestions[section.id] || [];
        let questionsToUse = [];

        if (manualQuestions.length > 0) {
            questionsToUse = manualQuestions;
        } else {
            // Automatic pick
            if (section.isOrType) {
                const shuffled = shuffleArray(pool);
                for (let i = 0; i < section.maxQuestions; i++) {
                    if (i * 2 + 1 < shuffled.length) {
                        questionsToUse.push({
                            mode: 'or',
                            questions: [
                                JSON.parse(JSON.stringify(shuffled[i * 2])),
                                JSON.parse(JSON.stringify(shuffled[i * 2 + 1]))
                            ]
                        });
                    }
                }
            } else {
                questionsToUse = pickRandom(pool, section.maxQuestions);
            }
        }

        const { html: sectionHtml, nextQNum } = generateSectionHTML(section, questionsToUse, currentGlobalQNum, index);
        html += sectionHtml;
        currentGlobalQNum = nextQNum;
    });

    html += `</section>`;    // --- Added Formula Sheet Feature ---
    const subjectValue = (document.getElementById('subject')?.value || '').toLowerCase();
    const isMaths = subjectValue.includes('maths') || subjectValue.includes('mathematics');

    if (isMaths) {
        let hasFormulas = false;
        let formulaHtml = `
            <div class="formula-reference-section" style="margin-top: 50px; border-top: 2px solid #333; padding-top: 20px; page-break-before: always;">
                <h2 style="text-align: center; text-decoration: underline; margin-bottom: 20px;">FORMULA REFERENCE SHEET</h2>
        `;

        selectedChapters.forEach(chapter => {
            const chapterData = questionBank[chapter];
            if (chapterData && chapterData.formulas && chapterData.formulas.length > 0) {
                hasFormulas = true;
                formulaHtml += `
                    <div class="chapter-formula-block" style="margin-bottom: 25px;">
                        <h3 style="background: #f1f5f9; padding: 5px 10px; border-left: 4px solid var(--color-primary); font-size: 1.1rem; margin-bottom: 10px;">
                            Chapter: ${chapter}
                        </h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; background: white;">
                            <thead>
                                <tr style="background: #f8fafc;">
                                    <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; width: 40%;">Description</th>
                                    <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">Formula</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                chapterData.formulas.forEach(f => {
                    formulaHtml += `
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 0.95rem;">${f.name}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-family: 'Times New Roman'; font-size: 1.1rem;">${f.eqn}</td>
                        </tr>
                    `;
                });

                formulaHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
        });

        formulaHtml += `</div>`;
        if (hasFormulas) {
            html += formulaHtml;
        }
    }

    // Add Footer
    /*
        PRINT PREVIEW FOOTER SECTION
            (Starts here)
    */
    html += `
        <div class="paper-footer" style="text-align: center; margin-top: 20px; font-weight: bold; font-style: italic;">
            ------- All the best -------
        </div>
    `;

    document.getElementById('paperPreview').innerHTML = html;


    // Apply current line spacing
    applyPaperStyles();

    // Save to history
    savePaperToHistory();

    // Trigger MathJax for the new paper content
    setTimeout(refreshMathJax, 100);
}

/**
 * Get the localStorage key for history based on user login status
 */
function getHistoryKey() {
    if (auth.currentUser) {
        return `qp_history_${auth.currentUser.uid} `; // User-specific key
    }
    return 'questionPaperHistory'; // Default/Guest key
}

/**
 * Load history from localStorage
 */
function loadHistory() {
    const key = getHistoryKey();
    const savedHistory = localStorage.getItem(key);

    papersHistory = []; // Reset first

    if (savedHistory) {
        try {
            papersHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.error("Error parsing history:", e);
        }
    }
    renderHistory();
}

/**
 * Save current paper configuration to history
 */
function savePaperToHistory() {
    try {
        const examName = document.getElementById('examName').value || 'Untitled Paper';
        const timestamp = new Date().toLocaleString();

        // Save current configuration for reloading
        const paperState = {
            name: examName,
            date: timestamp,
            config: {
                standard: document.getElementById('standard').value,
                subject: document.getElementById('subject').value,
                examName: document.getElementById('examName').value,
                examMonth: document.getElementById('examMonth').value,
                examTime: document.getElementById('examTime').value,
                totalMarks: document.getElementById('totalMarks').value,
                selectedChapters: [...selectedChapters],
                sections: JSON.parse(JSON.stringify(sections)),
                sectionQuestions: JSON.parse(JSON.stringify(sectionQuestions))
            }
        };

        // Check if a paper with same details already exists at the top to avoid duplicates
        // We only compare name and marks as a simple heuristic
        if (papersHistory.length > 0 &&
            papersHistory[0].name === paperState.name &&
            JSON.stringify(papersHistory[0].config.sections) === JSON.stringify(paperState.config.sections) &&
            JSON.stringify(papersHistory[0].config.sectionQuestions) === JSON.stringify(paperState.config.sectionQuestions)) {
            // Already saved exactly as is, just update timestamp
            papersHistory[0].date = timestamp;
        } else {
            papersHistory.unshift(paperState);
        }

        // Keep only last 10 papers
        if (papersHistory.length > 10) papersHistory.pop();

        localStorage.setItem(getHistoryKey(), JSON.stringify(papersHistory));
        renderHistory();
    } catch (err) {
        console.error("Error saving to history:", err);
    }
}

/**
 * Render the history list in Tab 1 with Filtering support
 */
function renderHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    // Get Filter Values
    const fName = document.getElementById('filterHistoryName')?.value.toLowerCase() || '';
    const fSub = document.getElementById('filterHistorySubject')?.value.toLowerCase() || '';
    const fClass = document.getElementById('filterHistoryClass')?.value || '';
    const fMarks = document.getElementById('filterHistoryMarks')?.value || '';
    const fDate = document.getElementById('filterHistoryDate')?.value.toLowerCase() || '';

    // Map to preserve original indices for actions
    const indexedPapers = papersHistory.map((p, i) => ({ paper: p, originalIndex: i }));

    // Filter Logic
    const displayList = indexedPapers.filter(item => {
        const paper = item.paper;
        const conf = paper.config || {};
        const pName = (paper.name || '').toLowerCase();
        const pSub = (conf.subject || '').toLowerCase();
        const pStd = (conf.standard || '').toString();
        const pMarks = (conf.totalMarks || '').toString();

        // Date Check
        let dateMatch = true;
        if (fDate) {
            // stored paper.date is "M/D/YYYY, H:MM:SS AM" or similar locale string
            // filter date is "YYYY-MM-DD"
            const pDateObj = new Date(paper.date);
            const fDateObj = new Date(fDate);

            // Compare YYYY-MM-DD parts
            if (!isNaN(pDateObj.getTime()) && !isNaN(fDateObj.getTime())) {
                const isSameDate = pDateObj.getDate() === fDateObj.getDate() &&
                    pDateObj.getMonth() === fDateObj.getMonth() &&
                    pDateObj.getFullYear() === fDateObj.getFullYear();
                dateMatch = isSameDate;
            } else {
                // Fallback to string match if parsing fails
                dateMatch = (paper.date || '').includes(fDate);
            }
        }

        return pName.includes(fName) &&
            pSub.includes(fSub) &&
            pStd.includes(fClass) &&
            pMarks.includes(fMarks) &&
            dateMatch;
    });

    if (displayList.length === 0) {
        historyList.innerHTML = `
    <div class="empty-history" >
        <span style="font-size: 2rem; display: block; margin-bottom: 10px;">📄</span>
                ${papersHistory.length === 0 ? "No previously generated papers yet." : "No papers match your filters."}
            </div> `;
        return;
    }

    historyList.innerHTML = displayList.map(item => {
        const paper = item.paper;
        const index = item.originalIndex; // Use original index for correct actions
        return `
    <div class="history-item" onclick = "loadPaperFromHistory(${index}, true)" >
            <div class="history-info">
                <h4>${paper.name}</h4>
            </div>
            <p><strong>Subject:</strong> ${paper.config.subject} (${paper.config.standard})</p>
            <p class="history-date"><strong>Generated:</strong> ${paper.date}</p>
            <p><strong>Marks:</strong> ${paper.config.totalMarks}</p>
            <div class="history-actions">
                <button class="btn btn-sm btn-outline btn-history" onclick="event.stopPropagation(); loadPaperFromHistory(${index}, false)" title="Edit this paper">✏️ Edit</button>
                <button class="btn btn-sm btn-primary btn-history" onclick="event.stopPropagation(); loadPaperFromHistory(${index}, true)" title="View Preview">👁️ Preview</button>
                <button class="btn btn-sm btn-secondary btn-history" style="color: #ef4444; border-color: #ef4444;" onclick="event.stopPropagation(); deletePaperFromHistory(${index})" title="Delete">🗑️</button>
            </div>
        </div>
    `}).join('');
}


/**
 * Load a paper from history
 * @param {number} index - Index in history array
 * @param {boolean} goToPreview - If true, jump to Tab 5, else stay on Tab 1 for editing
 */
function loadPaperFromHistory(index, goToPreview = true) {
    if (!confirm(goToPreview ? "Load this paper and view preview?" : "Load this paper for editing? Current unsaved progress will be lost.")) return;

    const paper = papersHistory[index];
    const config = paper.config;

    try {
        // Restore data
        document.getElementById('standard').value = config.standard;
        loadClassData(config.standard);

        setTimeout(() => {
            const subjectEl = document.getElementById('subject');
            if (subjectEl) {
                subjectEl.value = config.subject;
                loadSubjectChapters(config.subject);
            }

            document.getElementById('examName').value = config.examName;
            document.getElementById('examMonth').value = config.examMonth;
            document.getElementById('examTime').value = config.examTime;
            document.getElementById('totalMarks').value = config.totalMarks;

            selectedChapters = config.selectedChapters || [];
            sections = config.sections || [];
            sectionQuestions = config.sectionQuestions || {};

            if (goToPreview) {
                // Go to preview directly
                currentTab = 5;
                showTab(5);
                generateFinalPaper();
            } else {
                // Stay on first tab for editing
                currentTab = 1;
                showTab(1);
            }

            saveState();
        }, 200);
    } catch (err) {
        alert("Error loading paper from history.");
        console.error(err);
    }
}

/**
 * Delete a paper from history
 */
function deletePaperFromHistory(index) {
    if (!confirm("Delete this paper from history?")) return;
    papersHistory.splice(index, 1);
    localStorage.setItem('questionPaperHistory', JSON.stringify(papersHistory));
    renderHistory();
}


/**
 * Apply all paper formatting styles from state
 */
function applyPaperStyles() {                      // Converts JS state to CSS in Preview
    const paper = document.getElementById('paperPreview'); // Target paper container
    if (!paper) return;                                // Safety exit

    paper.style.lineHeight = currentLineHeight;        // Apply dynamic row spacing
    paper.style.fontSize = pFontSize + 'pt';           // Apply text scale
    paper.style.fontFamily = pFontFamily;              // Apply chosen font face
    paper.style.fontWeight = pBold ? 'bold' : 'normal'; // Toggle bolding
    paper.style.fontStyle = pItalic ? 'italic' : 'normal'; // Toggle slanting

    let decoration = [];                               // Collect multi-deco (U + S)
    if (pUnderline) decoration.push('underline');      // add underline decoration
    if (pStrike) decoration.push('line-through');      // add strikethrough decoration
    paper.style.textDecoration = decoration.length > 0 ? decoration.join(' ') : 'none'; // Apply joined string

    paper.style.textAlign = pAlign;                    // Set horizontal alignment
    paper.style.textTransform = pCase;                // Set UPPER/lower CASE
    paper.style.color = pFontColor;                    // Set text ink color

    paper.style.backgroundColor = (pHighlightColor && pHighlightColor !== '#ffffff') ? pHighlightColor : 'white'; // Set sheet background

    paper.style.paddingLeft = (40 + pIndent) + 'px';   // Add user indent to base margin
    paper.style.paddingRight = (40 + pIndent) + 'px';  // Symmetric right margin

    if (pBorder) {                                     // If page border is ON
        paper.style.border = '1px solid black';         // show thin black line around sheet
        paper.style.boxShadow = 'none';                // remove shadow for high-clarity view
    } else {                                           // If page border is OFF
        paper.style.border = 'none';                   // remove sheet outline
        paper.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)'; // show soft drop shadow instead
    }

    updateToolbarUI();                                 // Sync the toolbar checkboxes/dropdowns
}

function updateToolbarUI() {
    // Sync Selects
    const fontSelect = document.getElementById('tool-font-family');
    if (fontSelect) fontSelect.value = pFontFamily;

    const sizeSelect = document.getElementById('tool-font-size'); // New size dropdown
    if (sizeSelect) sizeSelect.value = pFontSize;

    const caseSelect = document.getElementById('tool-case');
    if (caseSelect) caseSelect.value = pCase;

    // Sync Toggles
    const toggleIds = {
        'tool-bold': pBold,
        'tool-italic': pItalic,
        'tool-underline': pUnderline,
        'tool-strike': pStrike,
        'tool-sub': pSub,
        'tool-sup': pSup,
        'tool-border': pBorder,
        'tool-align-left': pAlign === 'left',
        'tool-align-center': pAlign === 'center',
        'tool-align-right': pAlign === 'right',
        'tool-align-justify': pAlign === 'justify'
    };

    for (const [id, active] of Object.entries(toggleIds)) {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('active', active);
    }

    // Sync Colors
    const fontColorInput = document.getElementById('tool-font-color');
    if (fontColorInput) fontColorInput.value = pFontColor;
    const fontColorIndicator = document.getElementById('font-color-indicator');
    if (fontColorIndicator) fontColorIndicator.style.backgroundColor = pFontColor;

    const highlightColorInput = document.getElementById('tool-highlight-color');
    if (highlightColorInput) highlightColorInput.value = pHighlightColor;

    // Sync Labels
    const sizeLabel = document.getElementById('tool-font-size-label');
    if (sizeLabel) sizeLabel.textContent = pFontSize;

    const spacingLabel = document.getElementById('tool-spacing-label');
    if (spacingLabel) spacingLabel.textContent = currentLineHeight.toFixed(1);
}

function updatePaperStyle(attr, val) {
    const paper = document.getElementById('paperPreview');
    const sel = window.getSelection();
    const isSelectionInPaper = sel.rangeCount > 0 && paper.contains(sel.anchorNode);

    // Apply to Selection if active
    if (isSelectionInPaper) {
        if (attr === 'fontFamily') document.execCommand('fontName', false, val);
        if (attr === 'fontColor') document.execCommand('foreColor', false, val);
        if (attr === 'highlightColor') document.execCommand('hiliteColor', false, val);
        if (attr === 'align') {
            const alignMap = { 'left': 'justifyLeft', 'center': 'justifyCenter', 'right': 'justifyRight', 'justify': 'justifyFull' };
            document.execCommand(alignMap[val], false, null);
        }
        if (attr === 'fontSize') {
            applyStyleToSelection('fontSize', val + 'pt');
        }
        if (attr === 'case') {
            applyStyleToSelection('textTransform', val);
        }
        return;
    }

    // No global fallback - tools apply only to selection
}

function applyStyleToSelection(styleProp, value) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style[styleProp] = value;

    // Extract contents -> wrap in span -> insert
    // Note: extractContents removes it from DOM, so we wrap and put it back
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);

    // Clear selection to avoid confusion or re-select wrapped
    sel.removeAllRanges();

    // Re-select the newly created span so user can apply more styles
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.addRange(newRange);
}

function togglePaperStyle(style) {
    const paper = document.getElementById('paperPreview');
    const sel = window.getSelection();
    const isSelectionInPaper = sel.rangeCount > 0 && paper.contains(sel.anchorNode);

    // Apply to Selection if active
    if (isSelectionInPaper) {
        const cmdMap = {
            'bold': 'bold',
            'italic': 'italic',
            'underline': 'underline',
            'strike': 'strikeThrough',
            'sub': 'subscript',
            'sup': 'superscript',
            'border': null // Border is global only
        };

        if (cmdMap[style]) {
            document.execCommand(cmdMap[style], false, null);
            return;
        }
    }

    // Page Border is the exception - it is inherently a "Page" property
    if (style === 'border') {
        pBorder = !pBorder;
        applyPaperStyles();
        saveState();
    }
}


function adjustIndent(delta) {
    // Use execCommand for indent/outdent on selection/block
    const paper = document.getElementById('paperPreview');
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && paper.contains(sel.anchorNode)) {
        if (delta > 0) document.execCommand('indent', false, null);
        else document.execCommand('outdent', false, null);
    }
}

function adjustFontSize(delta) {
    const paper = document.getElementById('paperPreview');
    const sel = window.getSelection();
    const isSelectionInPaper = sel.rangeCount > 0 && paper.contains(sel.anchorNode);

    if (isSelectionInPaper) {
        // Get current font size of selection
        // We look at the parent element of the anchor node
        const parent = sel.anchorNode.parentElement;
        const computed = window.getComputedStyle(parent).fontSize;
        // computed is usually in px. Convert to integer (approx)
        let currentPx = parseFloat(computed);
        // Convert Px to Pt approx (1px = 0.75pt) or just work with generic units. 
        // Let's just scale the existing unit.
        // Actually, our tool works in PT. 
        // 16px = 12pt. 
        let currentPt = currentPx * 0.75;
        let newPt = Math.max(8, Math.min(72, Math.round(currentPt) + delta));

        applyStyleToSelection('fontSize', newPt + 'pt');
    }
}

function adjustLineSpacing(delta) {
    currentLineHeight = Math.max(1.0, Math.min(2.5, currentLineHeight + delta));
    applyPaperStyles();
    saveState();
}

// --- New Toolbar Functions (Table, Image, Symbols, Tools) ---

function insertTable() {
    const paper = document.getElementById('paperPreview');
    if (!paper) return;

    // Simple 3x3 Table append
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';
    table.style.marginBottom = '10px';

    for (let i = 0; i < 3; i++) {
        const tr = document.createElement('tr');
        for (let j = 0; j < 3; j++) {
            const td = document.createElement('td');
            td.style.border = '1px solid black';
            td.style.padding = '8px';
            td.innerText = `Row ${i + 1} Col ${j + 1} `;
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    // Insert at cursor if capable
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && paper.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(table);
        // Move cursor after
        range.setStartAfter(table);
        range.setEndAfter(table);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        paper.appendChild(table);
    }
}

function insertImage() {
    const paper = document.getElementById('paperPreview');
    if (!paper) return;

    // Create a file input dynamically
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.classList.add('resizable-img');
                img.style.maxWidth = '250px'; // Initial size
                img.style.display = 'inline-block'; // Initial display
                img.style.verticalAlign = 'middle';
                img.style.cursor = 'pointer';
                img.onclick = (e) => {
                    e.stopPropagation();
                    selectImage(img);
                };

                // If cursor is in paper, insert at cursor
                const sel = window.getSelection();
                if (sel.rangeCount > 0 && paper.contains(sel.anchorNode)) {
                    const range = sel.getRangeAt(0);
                    range.insertNode(img);
                    range.collapse(false);
                } else {
                    paper.appendChild(img);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// --- Image Interaction Logic ---

let selectedImage = null;

// Initialize Overlay on Load (call this once in global scope or init)
function setupImageOverlay() {
    const paper = document.getElementById('paperPreview');
    if (!paper || document.getElementById('image-tools-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'image-tools-overlay';
    overlay.innerHTML = `
    <div class="resize-handle nw" data - handle="nw" ></div>
        <div class="resize-handle ne" data-handle="ne"></div>
        <div class="resize-handle sw" data-handle="sw"></div>
        <div class="resize-handle se" data-handle="se"></div>
        <button class="remove-btn-img" onclick="deleteSelectedImage()">🗑 Remove</button>
`;
    paper.appendChild(overlay);

    // Global Deselect
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('resizable-img') &&
            !e.target.closest('#image-tools-overlay')) {
            deselectImage();
        }
    });

    // Handle Dragging Logic for Overlay Handles
    initResizeLogic(overlay);
}

function selectImage(img) {
    if (selectedImage === img) return;
    deselectImage();

    selectedImage = img;
    selectedImage.classList.add('selected');

    updateOverlayPosition();
    const overlay = document.getElementById('image-tools-overlay');
    if (overlay) overlay.style.display = 'block';

    // Enable Drag on Image
    // We attach mousedown to the image itself for moving
    img.onmousedown = startDragImage;
}

function deselectImage() {
    if (selectedImage) {
        selectedImage.classList.remove('selected');
        selectedImage.onmousedown = null; // Clean up
        selectedImage = null;
    }
    const overlay = document.getElementById('image-tools-overlay');
    if (overlay) overlay.style.display = 'none';
}

function deleteSelectedImage() {
    if (selectedImage) {
        selectedImage.remove();
        deselectImage();
    }
}

function updateOverlayPosition() {
    if (!selectedImage) return;
    const overlay = document.getElementById('image-tools-overlay');
    if (!overlay) return;

    const paper = document.getElementById('paperPreview');
    const paperRect = paper.getBoundingClientRect();
    const imgRect = selectedImage.getBoundingClientRect();

    // Calculate relative position within paper
    // Scroll correction is important if paper scrolls
    // But since paper is usually fixed size preview... simpler logic:

    overlay.style.width = selectedImage.offsetWidth + 'px';
    overlay.style.height = selectedImage.offsetHeight + 'px';

    // Overlay is absolute child of paper (paper has relative)
    // We need offsetLeft/Top of image relative to paper
    // simplest way:
    overlay.style.left = (selectedImage.offsetLeft) + 'px';
    overlay.style.top = (selectedImage.offsetTop) + 'px';

    // If image is inline, offsetTop/Left works relative to offsetParent (paper) usually?
    // If image is inline in a P, offsetParent might be P.
    // We need map to paper coordinates.

    const relativeTop = imgRect.top - paperRect.top + paper.scrollTop;
    const relativeLeft = imgRect.left - paperRect.left + paper.scrollLeft;

    overlay.style.left = relativeLeft + 'px';
    overlay.style.top = relativeTop + 'px';
}

// --- Drag & Resize Handlers ---

let isDraggingImg = false;
let isResizingImg = false;
let dragStartX, dragStartY;
let initialLeft, initialTop;
let initialWidth, initialHeight;
let activeHandle = null;

function startDragImage(e) {
    e.preventDefault(); // Prevent default drag behavior
    isDraggingImg = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // Ensure absolute positioning if not already
    // When dragging starts, we convert to absolute to allow free movement
    if (selectedImage.style.position !== 'absolute') {
        const overlay = document.getElementById('image-tools-overlay');
        selectedImage.style.position = 'absolute';
        selectedImage.style.left = overlay.style.left; // Sync
        selectedImage.style.top = overlay.style.top;   // Sync
    }

    initialLeft = parseInt(selectedImage.style.left || 0);
    initialTop = parseInt(selectedImage.style.top || 0);

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e) {
    if (!isDraggingImg) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    selectedImage.style.left = (initialLeft + dx) + 'px';
    selectedImage.style.top = (initialTop + dy) + 'px';

    updateOverlayPosition();
}

/**
 * Drag & Resize Handlers
 */

function onDragEnd() {
    isDraggingImg = false;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
}

function initResizeLogic(overlay) {
    const handles = overlay.querySelectorAll('.resize-handle');
    handles.forEach(h => {
        h.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isResizingImg = true;
            activeHandle = e.target.dataset.handle;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            initialWidth = selectedImage.offsetWidth;
            initialHeight = selectedImage.offsetHeight;

            document.addEventListener('mousemove', onResizeMove);
            document.addEventListener('mouseup', onResizeEnd);
        });
    });
}

function onResizeMove(e) {
    if (!isResizingImg) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    let newW = initialWidth;
    let newH = initialHeight;

    // Simple logic: SE handle
    // Enhance for corners if needed, but SE is standard
    if (activeHandle.includes('e')) newW = initialWidth + dx;
    if (activeHandle.includes('w')) newW = initialWidth - dx; // Complex due to position shift
    if (activeHandle.includes('s')) newH = initialHeight + dy;
    if (activeHandle.includes('n')) newH = initialHeight - dy;

    // Constrain
    if (newW > 20) selectedImage.style.width = newW + 'px';
    if (newH > 20) selectedImage.style.height = newH + 'px';

    updateOverlayPosition();
}

function onResizeEnd() {
    isResizingImg = false;
    activeHandle = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    updateOverlayPosition(); // Clean sync
}

function insertSymbol(type) {
    const paper = document.getElementById('paperPreview');
    if (!paper) return;

    const symbols = {
        'pi': 'π',
        'omega': 'Ω',
        'sigma': 'Σ',
        'alpha': 'α'
    };

    const span = document.createElement('span');
    span.innerText = symbols[type] || '';
    span.style.fontSize = '1.2em';
    span.style.padding = '0 2px';

    // Insert at cursor if capable
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && paper.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents(); // Remove selected text if any
        range.insertNode(span);
        // Move cursor after
        range.setStartAfter(span);
        range.setEndAfter(span);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        paper.appendChild(span);
    }
}

function insertDate() {
    const paper = document.getElementById('paperPreview');
    if (!paper) return;

    const dateDiv = document.createElement('div');
    dateDiv.innerText = new Date().toLocaleDateString();
    dateDiv.style.textAlign = 'right';
    dateDiv.style.fontSize = '0.9em';
    dateDiv.style.marginTop = '10px';
    // Insert at cursor if capable
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && paper.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(dateDiv);
        range.collapse(false);
    } else {
        paper.appendChild(dateDiv);
    }
}

function toRoman(num) {
    const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '';
    for (let i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

function getWordCount() {
    const paper = document.getElementById('paperPreview');
    if (!paper) return;

    const text = paper.innerText || "";
    const words = text.trim().split(/\s+/).length;
    alert(`Word Count estimate: ${words} words`);
}

/**
 * Generates and downloads the question paper as a PDF file directly.
 * Uses html2pdf.js library to convert the 'paperPreview' element to a high-quality PDF.
 */
function saveAsPDF(e) {
    const eventObj = e || window;
    const paper = document.getElementById('paperPreview');
    if (!paper) return;

    // Show loading state or feedback
    let btn = null;
    let originalBtnText = "";

    if (eventObj && eventObj.target) {
        btn = eventObj.target.closest('button');
        if (btn) {
            originalBtnText = btn.innerHTML;
            btn.innerHTML = "⏳ Generating...";
            btn.disabled = true;
        }
    }

    const examName = document.getElementById('examName').value || 'Question_Paper';
    const subject = document.getElementById('subject').value || '';

    // Create a clean filename
    const cleanExamName = examName.trim().replace(/\s+/g, '_');
    const cleanSubject = subject.trim().replace(/\s+/g, '_');
    const fileName = `${cleanExamName}${cleanSubject ? '_' + cleanSubject : ''}.pdf`;

    // Save original styles
    const originalStyles = {
        position: paper.style.position,
        left: paper.style.left,
        top: paper.style.top,
        margin: paper.style.margin,
        boxShadow: paper.style.boxShadow,
        border: paper.style.border,
        borderRadius: paper.style.borderRadius,
        width: paper.style.width
    };

    // Temporarily modify paper for clean capture
    paper.contentEditable = "false"; // Disable editing to hide cursor/focus
    const imageOverlay = document.getElementById('image-tools-overlay');
    if (imageOverlay) imageOverlay.style.display = 'none'; // Hide resizing tools

    paper.style.width = '210mm';
    paper.style.position = 'relative';
    paper.style.left = '0';
    paper.style.top = '0';
    paper.style.margin = '0 auto  '; // Center for capture context
    paper.style.boxShadow = 'none';
    paper.style.border = 'none';
    paper.style.borderRadius = '0';
    paper.style.backgroundColor = 'white';

    // Configuration for html2pdf
    const opt = {
        margin: 0,
        filename: fileName,
        saveAsPDF: { type: 'pdf', quality: 1.0 },
        html2pdf: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0,
            width: 210,
            windowWidth: 210,
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['.question', '.section-header', '.paper-header', 'empty-page']
        }
    };

    // Restore original styles function
    function restoreStyles() {
        paper.contentEditable = "true";
        if (imageOverlay && selectedImage) imageOverlay.style.display = 'block';

        paper.style.position = originalStyles.position;
        paper.style.left = originalStyles.left;
        paper.style.top = originalStyles.top;
        paper.style.margin = originalStyles.margin;
        paper.style.boxShadow = originalStyles.boxShadow;
        paper.style.border = originalStyles.border;
        paper.style.borderRadius = originalStyles.borderRadius;
        paper.style.width = originalStyles.width;
    }

    // Run the conversion
    html2pdf().set(opt).from(paper).save().then(() => {
        restoreStyles();
        if (btn) {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    }).catch(err => {
        console.error('PDF Generation Error:', err);
        restoreStyles();
        alert('Error generating PDF. Please try again.');
        if (btn) {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    });
}

function generateSectionHTML(section, questions, startQNo, sectionIndex) { // Recursive builder for paper parts
    const totalSectionMarks = section.attemptQuestions * section.marksPerQuestion; // Sub-sum for header
    let currentQNo = startQNo;                        // Counter for question numbers
    const partLabel = `${toRoman(sectionIndex + 1)}.`; // Convert block index to Roman (I, II, III)
    const sectionNote = getSectionNote(section);      // Get "Answer any X" style instruction

    let html = `                                       <!--Part wrap start-->
    <div class="section">
        <div class="section-header">              <!-- Styled row for title and marks -->
            <div class="section-title">
                <span style="font-weight:bold;">${partLabel}</span>
                ${sectionNote}                    <!-- Instructions display -->
                <span class="compulsory-header-notice">${getCompulsoryNotice(questions, startQNo, section)}</span> <!-- Special Q notice -->
            </div>
            <div class="section-marks">${section.attemptQuestions} × ${section.marksPerQuestion} = ${totalSectionMarks}</div> <!-- (Marks display) -->
        </div>
        `;

    questions.forEach((q, idx) => {                    // Loop through questions in this Part
        if (!q || q.isPlaceholder) return;             // Ignore unfilled slots
        html += renderQuestionForPaper(q, currentQNo + '.'); // Generate HTML for the Q
        currentQNo++;                                  // Bump global number
    });


    html += `</div>`;
    return { html, nextQNum: currentQNo };
}

function getCompulsoryNotice(questions, startQNo, overrideSection = null) {
    const section = overrideSection || sections[activeSectionTab];
    if (section && section.compulsoryIndex !== null && section.compulsoryIndex !== undefined) {
        const qIdx = Number(section.compulsoryIndex);
        // Check if the question at this index exists and is not a placeholder
        if (questions && questions[qIdx] && !questions[qIdx].isPlaceholder) {
            return `(Q.No: ${startQNo + qIdx} is compulsory)`;
        }
    }
    return '';
}

function getSectionNote(section) {
    if (section.attemptQuestions === section.maxQuestions) return "Answer all the questions.";
    return `Answer any ${section.attemptQuestions} of the following questions.`;
}

/**
 * Heuristic to determine MCQ layout based on text length
 */
function getOptionLayoutClass(options) {
    if (!options || options.length === 0) return 'cols-4';

    // Calculate the maximum length of any option text
    const maxLength = Math.max(...options.map(opt => (opt || "").toString().trim().length));

    // Thresholds for A4 page width (~170mm content area)
    if (maxLength < 15) return 'cols-4'; // Fits in 1 row
    if (maxLength < 35) return 'cols-2'; // Fits in 2 rows (2x2)
    return 'cols-1';                      // Stacked vertically (4 rows)
}

function renderQuestionForPaper(q, label) {
    if (!q || q.isPlaceholder) return '';

    if (q.questions) {
        // Complex (OR/AND)
        const partTitle = q.q || q.assertion || q.title || "";
        return `
    <div class="question" >
                <div class="question-number">${label}</div>
                <div class="question-content">
                    ${partTitle ? `<div style="font-weight: 600; margin-bottom: 8px;">${partTitle}</div>` : ''}
                    ${q.questions.map((subQ, i) => {
            const subHtml = renderQuestionForPaper(subQ, subQ.label || '');
            const separator = (q.mode === 'or' && i < q.questions.length - 1) ? '<div style="text-align: center; font-weight: bold; margin: 10px 0;">- OR -</div>' : '';
            return subHtml + separator;
        }).join('')}
                </div>
            </div> `;
    }

    // Single Question (MCQ, Answer, Match, etc.)
    let indexHtml = `<div class="question-text" > ${q.q || q.assertion || (q.title + (q.columnA ? ' (Match)' : ''))}</div> `;

    // Diagram support
    const imgPath = q.diagram || q.image;
    if (imgPath) {
        // If it's just a filename, assume it's in data/picture/
        const fullImgPath = (imgPath.includes('/') || imgPath.includes('\\')) ? imgPath : `data/picture/${imgPath}`;
        indexHtml += `<div class="question-diagram" style="margin-top: 10px; margin-bottom: 10px;">
            <img src="${fullImgPath}" style="max-width: 300px; height: auto; border: 1px solid #eee; padding: 5px; background: #fff;" alt="Question Diagram">
        </div>`;
    }

    if (q.options) {
        const layoutClass = getOptionLayoutClass(q.options);
        indexHtml += `
    <div class="options-inline ${layoutClass}" >
        ${q.options.map((opt, i) => `<span class="option">${String.fromCharCode(97 + i)}) ${opt}</span>`).join('')}
            </div> `;
    } else if (q.columnA) {
        indexHtml += `
    < table class="match-table" >
        ${q.columnA.map((item, idx) => `<tr><td>${item}</td><td>${q.columnB[idx]}</td></tr>`).join('')}
            </table > `;
    }

    return `<div class="question" ><div class="question-number">${label}</div><div class="question-content">${indexHtml}</div></div> `;
}

// Auto Generate Button
// Initialize application
// ==========================================
// DATA PERSISTENCE & HELPERS
// ==========================================

function saveState() {
    try {
        const state = {
            // Tab 1 Data
            standard: document.getElementById('standard').value,
            subject: document.getElementById('subject').value,
            examName: document.getElementById('examName').value,
            examMonth: document.getElementById('examMonth').value,
            examTime: document.getElementById('examTime').value,
            totalMarks: document.getElementById('totalMarks').value,

            // App State
            currentTab: currentTab,
            selectedChapters: selectedChapters,
            sections: sections,
            sectionQuestions: sectionQuestions,
            currentLineHeight: currentLineHeight,
            pFontSize: pFontSize,
            pFontFamily: pFontFamily,
            pBold: pBold,
            pItalic: pItalic,
            pUnderline: pUnderline,
            pStrike: pStrike,
            pSub: pSub,
            pSup: pSup,
            pCase: pCase,
            pFontColor: pFontColor,
            pHighlightColor: pHighlightColor,
            pAlign: pAlign,
            pIndent: pIndent,
            pBorder: pBorder
        };
        localStorage.setItem('questionPaperGeneratorState', JSON.stringify(state));
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

function loadState() {
    const savedState = localStorage.getItem('questionPaperGeneratorState');
    if (!savedState) return;

    stateRestoration = true; // Set flag at the very beginning to prevent overwriting during restoration

    try {
        const state = JSON.parse(savedState);

        // Restore Tab 1 Inputs
        if (state.standard) {
            const el = document.getElementById('standard');
            if (el) {
                el.value = state.standard;
                loadClassData(state.standard);
            }
        }

        if (state.subject) {
            setTimeout(() => {
                const el = document.getElementById('subject');
                if (el) {
                    el.value = state.subject;
                    loadSubjectChapters(state.subject);
                }
            }, 100);
        }

        if (state.examName) document.getElementById('examName').value = state.examName;
        if (state.examMonth) document.getElementById('examMonth').value = state.examMonth;
        if (state.examTime) document.getElementById('examTime').value = state.examTime;
        if (state.totalMarks) document.getElementById('totalMarks').value = state.totalMarks;

        // Restore App State
        selectedChapters = state.selectedChapters || [];
        sections = state.sections || [];
        sectionQuestions = state.sectionQuestions || {};
        currentLineHeight = state.currentLineHeight || 1.6;
        pFontSize = state.pFontSize || 12;
        pFontFamily = state.pFontFamily || "'Times New Roman', Times, serif";
        pBold = state.pBold || false;
        pItalic = state.pItalic || false;
        pUnderline = state.pUnderline || false;
        pStrike = state.pStrike || false;
        pSub = state.pSub || false;
        pSup = state.pSup || false;
        pCase = state.pCase || 'none';
        pFontColor = state.pFontColor || '#000000';
        pHighlightColor = state.pHighlightColor || '#ffffff';
        pAlign = state.pAlign || 'left';
        pIndent = state.pIndent || 0;
        pBorder = state.pBorder || false;

        setTimeout(() => { stateRestoration = false; }, 500); // Reset flag after all timeouts (like loadSubjectChapters) have completed


        // Restore active tab
        currentTab = state.currentTab !== undefined ? state.currentTab : 0;
        showTab(currentTab);

        // Re-render UI based on restored state
        if (currentTab === 2) populateChapterList();
        if (currentTab === 3) renderSections();
        if (currentTab === 4) renderQuestionSelectionTab();
        if (currentTab === 5) generateFinalPaper();

    } catch (e) {
        console.error("Error loading state:", e);
    }
}

function clearTab(tabNum) {
    if (tabNum === 1) {
        if (!confirm("This will clear ALL data across all tabs. Proceed?")) return;

        // Clear Tab 1
        document.getElementById('examName').value = '';
        document.getElementById('examMonth').value = '';
        document.getElementById('examTime').value = '';
        document.getElementById('totalMarks').value = '';
        document.getElementById('standard').selectedIndex = 0;
        loadClassData("11");
        document.getElementById('subject').selectedIndex = 0;

        // Clear All Other State
        selectedChapters = [];
        sections = [];
        sectionQuestions = {};

        // Refresh UI
        populateChapterList();
        renderSections();
        calculateTotalMarks();
        if (currentTab === 4) renderQuestionSelectionTab();

    } else if (tabNum === 2) {
        if (!confirm("Are you sure you want to clear portion selections?")) return;
        selectedChapters = [];
        populateChapterList();

    } else if (tabNum === 3) {
        if (!confirm("Are you sure you want to clear all sections?")) return;
        sections = [];
        sectionQuestions = {};
        renderSections();
        calculateTotalMarks();

    } else if (tabNum === 4) {
        const section = sections[activeSectionTab];
        if (!section) return;
        if (!confirm(`Are you sure you want to clear all selected questions for "${section.name || 'this section'}"?`)) return;

        // Reset questions only for the active section
        sectionQuestions[section.id] = [];

        // Reset compulsory index for this section as well if it's cleared
        section.compulsoryIndex = null;

        renderQuestionSelectionTab();
    }

    saveState(); // Update storage after clearing
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Populate dropdowns initially
    populateStandardDropdown();

    // Load saved state if exists, otherwise load defaults
    if (localStorage.getItem('qpGeneratorState')) {
        loadState();
    } else {
        // Default initialization if no save found
        const standardSelect = document.getElementById('standard');
        if (standardSelect) {
            loadClassData(standardSelect.value);
        }
    }

    // Add listeners for persistence
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', saveState);
        input.addEventListener('input', saveState); // For text inputs
    });

    // Re-attach listeners for dynamic logic logic
    const standardSelect = document.getElementById('standard');
    if (standardSelect) {
        standardSelect.addEventListener('change', function () {
            loadClassData(this.value);
            saveState();
        });
    }

    const subjectSelect = document.getElementById('subject'); // FIXED: Declare variable before use
    if (subjectSelect) {
        subjectSelect.addEventListener('change', function () {
            loadSubjectChapters(this.value);
            saveState();
        });
    }
});

// ==========================================
// IMPORT QUESTION MODAL LOGIC
// ==========================================

function openImportModal() {
    const modal = document.getElementById('importModal');
    if (!modal) return;

    // Populate Chapter Dropdown
    const chapterSelect = document.getElementById('importChapter');
    if (chapterSelect) {
        chapterSelect.innerHTML = '<option value="">-- Select Chapter --</option>' +
            selectedChapters.map(ch => `<option value = "${ch}" > ${ch}</option > `).join('');
    }

    // Reset Fields
    document.getElementById('importQText').value = '';

    // Show Modal
    modal.style.display = 'flex';
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'none';
}

function submitImportQuestion() {
    const qText = document.getElementById('importQText').value.trim();
    const chapter = document.getElementById('importChapter').value;
    const type = document.getElementById('importType').value;
    const source = document.querySelector('input[name="importSource"]:checked').value;

    if (!qText || !chapter) {
        alert("Please enter question text and select a chapter.");
        return;
    }

    // Create new question object
    const newQ = {
        q: qText,
        _chapter: chapter,
        // Helper properties for filtering logic
        bookBack: source === 'bookBack',
        interior: source === 'interior',
        isCustomImport: true
    };

    // Add type specific fields
    if (type === 'MCQ') {
        newQ.options = ["Option A", "Option B", "Option C", "Option D"]; // Placeholder options
    } else if (type === 'Match') {
        newQ.title = qText;
        delete newQ.q;
        newQ.columnA = ["Item 1", "Item 2", "Item 3"];
        newQ.columnB = ["Match 1", "Match 2", "Match 3"];
    } else if (type === 'Assertion') {
        newQ.assertion = qText;
        newQ.reason = "Reason text placeholder";
        delete newQ.q;
    } else if (type === 'Long Answer') {
        newQ.a = "Answer key placeholder";
    }

    // Add to runtime bank
    if (!questionBank[chapter]) {
        questionBank[chapter] = { mcq: [], shortAnswer: [], longAnswer: [] };
    }

    // Map type to bank category
    let category = 'shortAnswer'; // Default
    if (type === 'MCQ') category = 'mcq';
    else if (type === 'Long Answer') category = 'longAnswer';
    // Match and Assertion usually go to common or MCQ, but for simplicity:
    else if (type === 'Match' || type === 'Assertion') category = 'mcq';

    // Push to bank (structure depends on existing data schema, simplified here)
    if (questionBank[chapter][category] && Array.isArray(questionBank[chapter][category])) {
        // Flat array structure
        questionBank[chapter][category].push(newQ);
    } else if (questionBank[chapter][category]) {
        // Nested structure { bb: [], interior: [] }
        if (source === 'bookBack') {
            if (!questionBank[chapter][category].bb) questionBank[chapter][category].bb = [];
            questionBank[chapter][category].bb.push(newQ);
        } else {
            if (!questionBank[chapter][category].interior) questionBank[chapter][category].interior = [];
            questionBank[chapter][category].interior.push(newQ);
        }
    } else {
        // Fallback: Initialize category as flat array if missing
        questionBank[chapter][category] = [newQ];
    }

    // Close and Refresh
    closeImportModal();
    // Force re-render of current view to update bank counts/list
    if (activeSlotIndex !== null) {
        renderSectionQuestions();
    } else {
        // Just refresh the active view essentially
        renderQuestionSelectionTab();
    }
    alert("Question imported successfully to current session!");
}

// ==========================================
// UI HELPER FUNCTIONS
// ==========================================

window.toggleModeMenu = function (idx, subIdx = null) {
    const selector = subIdx !== null ? `mode-menu-${idx}-${subIdx}` : `mode-menu-${idx}`;
    const menu = document.getElementById(selector);
    if (menu) {
        const isVisible = menu.style.display === 'block';

        // Hide all others and reset z-index
        document.querySelectorAll('.mode-menu').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.q-card').forEach(card => card.style.zIndex = '');

        if (!isVisible) {
            menu.style.display = 'block';
            // Bring parent card to front
            const parentCard = menu.closest('.q-card');
            if (parentCard) {
                parentCard.style.zIndex = '1100';
            }
        }
    }
};

document.addEventListener('click', function (e) {
    // Close menus if clicking outside of them
    if (!e.target.closest('.mode-menu') && !e.target.closest('button.btn-icon')) {
        document.querySelectorAll('.mode-menu').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.q-card').forEach(card => card.style.zIndex = '');
    }
});

window.activeSubSlotIndex = null; // Track sub-slot (0, 1, etc.) for complex questions
window.activeInnerSlotIndex = null; // Track inner-slot (0, 1, etc.) for nested complex questions
window.editingState = null; // { sectionId, qIdx, subIdx, innerIdx }

window.startEditingQuestion = function (sectionId, idx, subIdx = null, innerIdx = null) {
    window.editingState = { sectionId, idx, subIdx, innerIdx };
    renderSectionQuestions();
};

window.saveEditedQuestionText = function () {
    if (!window.editingState) return;
    const { sectionId, idx, subIdx, innerIdx } = window.editingState;

    let q;
    let textAreaId;
    let optClassBase;

    if (innerIdx !== null && innerIdx !== undefined) {
        // Nested sub-slot
        const mainQ = sectionQuestions[sectionId][idx];
        if (mainQ.questions && mainQ.questions[subIdx] && mainQ.questions[subIdx].questions && mainQ.questions[subIdx].questions[innerIdx]) {
            q = mainQ.questions[subIdx].questions[innerIdx];
            textAreaId = `edit - q - ${idx} -${subIdx} -${innerIdx} `;
            optClassBase = `edit - opt - ${idx} -${subIdx} -${innerIdx} `;
        }
    } else if (subIdx !== null && subIdx !== undefined) {
        // Complex question sub-slot
        if (sectionQuestions[sectionId][idx].questions && sectionQuestions[sectionId][idx].questions[subIdx]) {
            q = sectionQuestions[sectionId][idx].questions[subIdx];
            textAreaId = `edit - q - ${idx} -${subIdx} `;
            optClassBase = `edit - opt - ${idx} -${subIdx} `;
        }
    } else {
        // Normal question
        q = sectionQuestions[sectionId][idx];
        textAreaId = `edit - q - ${idx} `;
        optClassBase = `edit - opt - ${idx} `;
    }

    if (!q) return;

    // Save Main Text
    const textVal = document.getElementById(textAreaId)?.value;
    if (textVal !== undefined) {
        if (q.q !== undefined) q.q = textVal;
        else if (q.assertion !== undefined) q.assertion = textVal;
        else if (q.title !== undefined) q.title = textVal;
    }

    // Save Options
    if (q.options && Array.isArray(q.options)) {
        const optInputs = document.querySelectorAll(`.${optClassBase} `);
        optInputs.forEach((input, i) => {
            if (i < q.options.length) {
                q.options[i] = input.value;
            }
        });
    }

    window.editingState = null;
    saveState();
    renderSectionQuestions();
};

window.cancelEditQuestion = function () {
    window.editingState = null;
    renderSectionQuestions();
};

window.activateSubSlot = function activateSubSlot(idx, subIdx, innerIdx = null) {
    activeSlotIndex = idx;
    window.activeSubSlotIndex = subIdx;
    window.activeInnerSlotIndex = innerIdx;

    // Set bank visibility flag to ensure it renders
    isBankVisible = true;

    renderSectionQuestions();
};

window.setSlotMode = function (sectionId, idx, mode, subIdx = null) {
    if (!sectionQuestions[sectionId] || !sectionQuestions[sectionId][idx]) return;

    const list = sectionQuestions[sectionId];
    const currentQ = list[idx];

    if (subIdx !== null && subIdx !== undefined) {
        // TARGETING A SUB-SLOT
        if (!currentQ.questions || !currentQ.questions[subIdx]) return;
        const targetSubQ = currentQ.questions[subIdx];

        if (mode === 'normal') {
            // PROMOTION: Sub-slot promoted to parent
            list[idx] = { ...targetSubQ };
            list[idx].mode = 'normal';
            delete list[idx].questions;
            delete list[idx].label;
        } else {
            // CONVERT SUB-SLOT TO COMPLEX (NESTED)
            let innerQs = [];
            let originalText = targetSubQ.q || targetSubQ.assertion || targetSubQ.title || "";

            if (targetSubQ.questions) {
                targetSubQ.mode = mode;
                innerQs = targetSubQ.questions;
            } else if (!targetSubQ.isPlaceholder) {
                // Use the current question as the first sub-sub-question
                innerQs = [{ ...targetSubQ }, { isPlaceholder: true }];
                delete innerQs[0].label;
            } else {
                innerQs = [{ isPlaceholder: true }, { isPlaceholder: true }];
            }

            // Inner Labels: a), b)...
            const labels = ['a)', 'b)', 'c)', 'd)'];
            innerQs.forEach((sq, i) => { if (!sq.label) sq.label = labels[i]; });

            currentQ.questions[subIdx] = {
                mode: mode,
                questions: innerQs,
                q: originalText // Keep original text as Part heading
            };
        }
    } else {
        // TARGETING MAIN SLOT
        if (mode === 'normal') {
            // Reset to simple object
            if (currentQ.questions && currentQ.questions[0]) {
                list[idx] = { ...currentQ.questions[0] };
            } else if (!currentQ.questions) {
                // Already normal
            } else {
                list[idx] = { isPlaceholder: true };
            }
            list[idx].mode = 'normal';
            delete list[idx].label;
        } else {
            // Convert to complex
            let subQs = [];
            if (currentQ.questions) {
                subQs = currentQ.questions;
            } else if (!currentQ.isPlaceholder) {
                subQs = [{ ...currentQ }, { isPlaceholder: true }];
                delete subQs[0].mode;
            } else {
                subQs = [{ isPlaceholder: true }, { isPlaceholder: true }];
            }

            const labels = ['i)', 'ii)', 'iii)', 'iv)'];
            subQs.forEach((sq, i) => { if (!sq.label) sq.label = labels[i]; });

            list[idx] = {
                mode: mode,
                questions: subQs
            };
        }
    }

    saveState();
    renderSectionQuestions();
};


window.updateSubSlotLabel = function (sectionId, idx, subIdx, value) {
    if (sectionQuestions[sectionId] && sectionQuestions[sectionId][idx] && sectionQuestions[sectionId][idx].questions) {
        sectionQuestions[sectionId][idx].questions[subIdx].label = value;
        saveState();
        renderSectionQuestions(); // Added refresh
    }
};

window.startEditingPartTitle = function (idx, subIdx) {
    if (!window.editingState) window.editingState = {};
    window.editingState.idx = idx;
    window.editingState.subIdx = subIdx;
    window.editingState.isPartTitle = true;
    renderSectionQuestions();
};

window.savePartTitle = function (sectionId, idx, subIdx) {
    const text = document.getElementById(`edit-part-title-${idx}-${subIdx}`)?.value;
    if (sectionQuestions[sectionId] && sectionQuestions[sectionId][idx] && sectionQuestions[sectionId][idx].questions) {
        sectionQuestions[sectionId][idx].questions[subIdx].q = text;
        window.editingState = null;
        saveState();
        renderSectionQuestions();
    }
};

window.toggleCompulsory = function (sectionId, idx) {
    // Call the unified top-level function
    toggleCompulsory(sectionId, idx);
};



// Initialize on load
window.onload = function () {
    // Populate standard dropdown if empty (initial load)
    if (document.getElementById('standard') && document.getElementById('standard').options.length <= 1) {
        populateStandardDropdown();
    }

    // Load existing state
    loadState();

    // Setup Image Tools
    setupImageOverlay();
};

// --- Symbol and Equation Popups ---

function openSymbolPopup() {
    const modal = document.getElementById('symbolModal');
    const grid = document.getElementById('symbolGrid');
    if (!modal || !grid) return;

    // Populate grid if empty
    if (grid.children.length === 0) {
        const symbols = [
            'p', 'O', 'S', 'a', '', '?', 'd', '?', '?', '',
            '', '', '', '', '', '', '', '', '', '', '',
            '', '', '', '', '', '', '', '', ''
        ];
        symbols.forEach(sym => {
            const btn = document.createElement('div');
            btn.className = 'symbol-btn';
            btn.innerText = sym;
            btn.onclick = () => insertSymbolChar(sym);
            grid.appendChild(btn);
        });
    }

    modal.style.display = 'flex';
}

function openEquationPopup() {
    const modal = document.getElementById('equationModal');
    if (modal) modal.style.display = 'flex';
}

function closePopup(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// Close modals on click outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
    }
}

function insertSymbolChar(char) {
    insertAtCursor(document.createTextNode(char));
    closePopup('symbolModal');
}

function insertEquation(type) {
    let node;

    if (type === 'fraction') {
        node = document.createElement('span');
        node.className = 'mq-fraction';
        node.innerHTML = '<span class="mq-numerator">x</span><span class="mq-denominator">y</span>';
    } else if (type === 'sqrt') {
        node = document.createElement('span');
        node.className = 'mq-sqrt';
        node.innerHTML = '<span class="mq-sqrt-symbol"></span><span class="mq-sqrt-content">x</span>';
    } else if (type === 'superscript') {
        node = document.createElement('span');
        node.innerHTML = 'x<sup>2</sup>';
    } else if (type === 'subscript') {
        node = document.createElement('span');
        node.innerHTML = 'x<sub>2</sub>';
    } else if (type === 'integral') {
        node = document.createElement('span');
        node.innerHTML = '';
    }

    if (node) {
        insertAtCursor(node);
    }

    closePopup('equationModal');
}

// Helper to insert node at cursor in paper
function insertAtCursor(node) {
    const paper = document.getElementById('paperPreview');
    const sel = window.getSelection();

    if (sel.rangeCount > 0 && paper.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(node);

        // Move selection after
        range.setStartAfter(node);
        range.setEndAfter(node);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        paper.appendChild(node);
    }
}

/* --- Advanced Equation Logic --- */
let currentEqType = '';

function selectEquationType(type) {
    currentEqType = type;
    document.getElementById('equationList').style.display = 'none';
    const form = document.getElementById('equationInputForm');
    form.style.display = 'block';

    const inputsBox = document.getElementById('eqInputsBox');
    inputsBox.innerHTML = '';

    if (type === 'fraction') {
        inputsBox.innerHTML = `
    <div class="equation-input-group" >
                <label>Numerator</label>
                <input type="text" id="eqInput1" placeholder="x" oninput="updateLivePreview()">
            </div>
            <div class="equation-input-group">
                <label>Denominator</label>
                <input type="text" id="eqInput2" placeholder="y" oninput="updateLivePreview()">
            </div>`;
    } else if (type === 'sqrt') {
        inputsBox.innerHTML = `
    <div class="equation-input-group" >
                <label>Value</label>
                <input type="text" id="eqInput1" placeholder="x" oninput="updateLivePreview()">
            </div>`;
    } else if (type === 'superscript') {
        inputsBox.innerHTML = `
    <div class="equation-input-group" >
                <label>Base</label>
                <input type="text" id="eqInput1" placeholder="x" oninput="updateLivePreview()">
            </div>
             <div class="equation-input-group">
                <label>Power</label>
                <input type="text" id="eqInput2" placeholder="2" oninput="updateLivePreview()">
            </div>`;
    } else if (type === 'subscript') {
        inputsBox.innerHTML = `
    <div class="equation-input-group" >
                <label>Base</label>
                <input type="text" id="eqInput1" placeholder="x" oninput="updateLivePreview()">
            </div>
             <div class="equation-input-group">
                <label>Subscript</label>
                <input type="text" id="eqInput2" placeholder="2" oninput="updateLivePreview()">
            </div>`;
    } else if (type === 'integral') {
        inputsBox.innerHTML = `
    <div class="equation-input-group" >
                <label>Expression (Optional)</label>
                <input type="text" id="eqInput1" placeholder="f(x)dx" oninput="updateLivePreview()">
            </div>`;
    }

    updateLivePreview();
}

function showEquationList() {
    document.getElementById('equationInputForm').style.display = 'none';
    document.getElementById('equationList').style.display = 'flex';
    currentEqType = '';
}

function updateLivePreview() {
    const preview = document.getElementById('eqLivePreview');
    // Using optional chaining and default values for cleaner code
    const val1 = document.getElementById('eqInput1') ? document.getElementById('eqInput1').value : '';
    const val2 = document.getElementById('eqInput2') ? document.getElementById('eqInput2').value : '';

    let html = '';

    if (currentEqType === 'fraction') {
        // Enclosed in backticks and inserted val1/val2
        html = `
    <span class="mq-fraction" >
                <span class="mq-numerator">${val1 || 'x'}</span>
                <span class="mq-denominator">${val2 || 'y'}</span>
            </span> `;
    } else if (currentEqType === 'sqrt') {
        html = `
    <span class="mq-sqrt" >
                <span class="mq-sqrt-symbol">√</span>
                <span class="mq-sqrt-content">${val1 || 'x'}</span>
            </span> `;
    } else if (currentEqType === 'superscript') {
        html = `${val1 || 'x'} <sup>${val2 || '2'}</sup>`;
    } else if (currentEqType === 'subscript') {
        html = `${val1 || 'x'} <sub>${val2 || 'n'}</sub>`;
    } else if (currentEqType === 'integral') {
        // Added the integral symbol and the expression value
        html = `∫ ${val1 || 'f(x)dx'} `;
    }

    preview.innerHTML = html;
}

function confirmInsertEquation() {
    const preview = document.getElementById('eqLivePreview');
    if (preview.innerHTML) {
        // Create a wrapper span to ensure it inserts as a single unit
        const wrapper = document.createElement('span');
        wrapper.innerHTML = preview.innerHTML;
        // Insert the children (the equation HTML)
        // Actually, insert the wrapper's content nodes
        // Or keep the wrapper? Let's keep wrapper if it helps styling, but our CSS classes are on children.
        // Let's insert the HTML string by creating a node.

        insertAtCursor(wrapper);
    }
    closePopup('equationModal');
    // Reset view
    showEquationList();
}

// Helper to convert number to Roman Numeral
function romanize(num) {
    if (isNaN(num)) return NaN;
    const digits = String(+num).split("");
    const key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
        "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
        "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
    let roman = "";
    let i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}
//maths formula conversion
// JSON-இல் இருந்து தரவுகளைப் பெற்று அட்டவணையாக மாற்றுதல்
function displayFormulas(chapterKey) {
    const formulas = questionBank[chapterKey] ? questionBank[chapterKey].formulas : [];
    if (!formulas || formulas.length === 0) return;

    let html = `<h3>${chapterKey} - Formulas</h3><table border="1">`;
    html += "<tr><th>Name</th><th>Equation</th></tr>";

    formulas.forEach(f => {
        html += `<tr><td>${f.name}</td><td>${f.eqn}</td></tr>`;
    });

    html += "</table>";
    const container = document.getElementById('formula-container');
    if (container) {
        container.innerHTML = html;
        // Trigger MathJax
        refreshMathJax();
    }
}
// ==========================================
// INITIALIZATION
// ==========================================

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function () {
    // Populate dropdowns
    populateStandardDropdown();
    populateSubjectDropdown();

    // Load saved state if exists
    loadState();

    // Load history
    loadHistory();

    // Show the current tab
    showTab(currentTab);

    // Add auto-save event listeners for Tab 1 inputs
    setTimeout(() => {
        // Ensure Enter creates a new line (div) reliably in contenteditable
        document.execCommand('defaultParagraphSeparator', false, 'div');

        const paperPreview = document.getElementById('paperPreview');
        if (paperPreview) {
            paperPreview.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    const selection = window.getSelection();
                    if (!selection.rangeCount) return;
                    const range = selection.getRangeAt(0);

                    // --- Handle Section Titles & Headers (Force Line Break or Move Row) ---
                    let node = range.startContainer;
                    let headerNode = null;
                    while (node && node !== paperPreview) {
                        if (node.nodeType === 1 && (
                            node.classList.contains('section-title') ||
                            node.classList.contains('section-marks') ||
                            node.classList.contains('exam-title') ||
                            node.classList.contains('meta-center') ||
                            node.classList.contains('meta-left') ||
                            node.classList.contains('meta-right') ||
                            node.classList.contains('paper-footer')
                        )) {
                            headerNode = node;
                            break;
                        }
                        node = node.parentNode;
                    }

                    if (headerNode) {
                        // Detect if we are at the very start of this header
                        const isAtStart = (range.startOffset === 0 && (range.startContainer === headerNode || headerNode.contains(range.startContainer) && (headerNode.firstChild === range.startContainer || headerNode.firstChild === range.startContainer.parentNode) && range.startOffset === 0));

                        if (isAtStart) {
                            // Find the container that has the background/design to move the WHOLE thing
                            let pushNode = headerNode;
                            if (headerNode.classList.contains('section-title') || headerNode.classList.contains('section-marks')) {
                                let p = headerNode.parentNode;
                                if (p && p.classList.contains('section-header')) pushNode = p;
                            } else if (headerNode.classList.contains('meta-left') || headerNode.classList.contains('meta-center') || headerNode.classList.contains('meta-right')) {
                                let p = headerNode.parentNode;
                                if (p && p.classList.contains('paper-meta')) pushNode = p;
                            }

                            e.preventDefault();
                            const brDiv = document.createElement('div');
                            brDiv.innerHTML = '<br>';
                            pushNode.parentNode.insertBefore(brDiv, pushNode);

                            // Maintain original selection
                            selection.removeAllRanges();
                            selection.addRange(range);
                            return;
                        }

                        // Normal behavior: Insert <br> inside for multi-line support
                        e.preventDefault();
                        const br = document.createElement('br');
                        range.deleteContents();
                        range.insertNode(br);
                        range.setStartAfter(br);
                        range.setEndAfter(br);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return;
                    }

                    // --- Handle Question Nodes (Insert Line Above if at start) ---
                    node = range.startContainer;
                    let questionNode = null;
                    let targetPart = null;

                    while (node && node !== paperPreview) {
                        if (node.nodeType === 1) { // Element node
                            if (node.classList.contains('question')) {
                                questionNode = node;
                                break;
                            }
                            if (node.classList.contains('question-number') || node.classList.contains('question-content')) {
                                targetPart = node;
                            }
                        }
                        node = node.parentNode;
                    }

                    if (questionNode && targetPart) {
                        // Detect if we are effectively at the start of the part
                        const isAtStart = (range.startOffset === 0 && (range.startContainer === targetPart || range.startContainer === targetPart.firstChild || targetPart.contains(range.startContainer) && targetPart.firstChild === range.startContainer));

                        if (isAtStart) {
                            // If at the start, insert a blank div BEFORE the whole question block
                            e.preventDefault();
                            const brDiv = document.createElement('div');
                            brDiv.innerHTML = '<br>';
                            questionNode.parentNode.insertBefore(brDiv, questionNode);

                            // Keep selection where it was
                            selection.removeAllRanges();
                            selection.addRange(range);
                            return;
                        }
                    }
                }
            });
        }
        const tab1Inputs = ['standard', 'subject', 'examName', 'examMonth', 'examTime', 'totalMarks'];
        tab1Inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // For select elements, use change event
                if (element.tagName === 'SELECT') {
                    element.addEventListener('change', () => {
                        if (id === 'standard') {
                            loadClassData(element.value);
                        } else if (id === 'subject') {
                            loadSubjectChapters(element.value);
                        }
                        saveState();
                    });
                } else {
                    // For text/number inputs, use input event with debounce
                    let timeout;
                    element.addEventListener('input', () => {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => {
                            saveState();
                        }, 500);
                    });
                }
            }
        });
    }, 1000);
});
