import { parseMultiset } from '../utils/multiset-parser.js';

// --- DOM Elements ---
const logOutputEl = document.getElementById('log-output');
const errorDisplayEl = document.getElementById('error-display');
const analyzeBtnEl = document.getElementById('analyze-psystem-btn');
const resultsDisplayEl = document.getElementById('maximally-parallel-sets-display');
const addMembraneButton = document.getElementById('add-membrane-btn');
const visualEditorArea = document.getElementById('visual-editor-area');
const rulesTextarea = document.getElementById('rules-textarea');
const parseResultsContainer = document.getElementById('parse-results-container');
let nextMembraneNumericId = 1;

// --- Logging and Error Display ---
function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    entry.classList.add('log-entry');
    if (type === 'error') entry.style.color = '#ef4444';
    else if (type === 'warn') entry.style.color = '#f59e0b';
    logOutputEl.appendChild(entry);
    logOutputEl.scrollTop = logOutputEl.scrollHeight;
}

function displayErrorText(message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'error-message p-3 bg-red-100 border border-red-300 rounded-md';
    paragraph.textContent = message;
    errorDisplayEl.replaceChildren(paragraph);
}

function clearError() {
    errorDisplayEl.replaceChildren();
}

// --- Visual Membrane Editor Functions ---
function createNewVisualMembrane(parentIdContainer, initialId = null, initialCharge = '0', initialObjectsStr = '') {
    const membraneNumericId = nextMembraneNumericId++;
    const membraneId = initialId || `mem${membraneNumericId}`;
    const memDiv = document.createElement('div');
    memDiv.classList.add('membrane-draggable');
    memDiv.setAttribute('id', `vis-${membraneId}`);
    memDiv.setAttribute('data-membrane-id', membraneId);
    let colorIdx = membraneNumericId - 1;
    const numericMatch = membraneId.match(/\d+/);
    if (numericMatch) colorIdx = parseInt(numericMatch[0]) - 1;
    memDiv.classList.add(`membrane-color-${Math.max(0, colorIdx) % 4}`);
    memDiv.innerHTML = `<div class="membrane-drag-handle" draggable="true"><div class="flex justify-between items-center"><span class="font-bold text-gray-700">ID: </span><input type="text" value="${membraneId}" class="membrane-id-input ml-2 flex-grow p-1 border-none bg-transparent focus:ring-0" placeholder="Membrane ID"/><button class="remove-membrane-btn text-red-500 hover:text-red-700 text-xs p-1 ml-2">&times;</button></div></div><div class="input-group"><label>Charge:</label><select class="membrane-charge-input charge-select"><option value="0" ${initialCharge === '0' ? 'selected' : ''}>0</option><option value="+" ${initialCharge === '+' ? 'selected' : ''}>+</option><option value="-" ${initialCharge === '-' ? 'selected' : ''}>-</option></select></div><div class="input-group"><label>Initial Objects (e.g., a:2,b):</label><input type="text" class="membrane-objects-input" value="${initialObjectsStr}" placeholder="a:1, b:2"></div><div class="membrane-content"></div>`;
    const targetContainer = (typeof parentIdContainer === 'string') ? document.getElementById(parentIdContainer) : parentIdContainer;
    if (targetContainer) {
        if (targetContainer.classList.contains('editor-area')) targetContainer.appendChild(memDiv);
        else {
            const contentArea = targetContainer.querySelector('.membrane-content');
            if (contentArea) contentArea.appendChild(memDiv);
            else targetContainer.appendChild(memDiv);
        }
    } else visualEditorArea.appendChild(memDiv);
    
    // Call the drag and drop listeners loaded from membrane-editor.js
    setupDragAndDrop(memDiv.querySelector('.membrane-drag-handle'), memDiv);
    memDiv.querySelector('.remove-membrane-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        memDiv.remove();
        log(`Membrane ${memDiv.dataset.membraneId} removed.`, 'info');
    });
    memDiv.querySelector('.membrane-id-input').addEventListener('change', (e) => {
        const oldId = memDiv.dataset.membraneId;
        const newId = e.target.value.trim();
        if (newId && newId !== oldId) {
            memDiv.setAttribute('data-membrane-id', newId);
            memDiv.setAttribute('id', `vis-${newId}`);
            log(`Membrane ID changed: ${oldId} -> ${newId}`, 'info');
        } else e.target.value = oldId;
    });
    addDropListeners(memDiv.querySelector('.membrane-content'), visualEditorArea);
    return memDiv;
}

// Initial visual setup
addDropListeners(visualEditorArea, visualEditorArea);
addMembraneButton.addEventListener('click', () => createNewVisualMembrane(visualEditorArea));

function parseMembraneStructureFromVisual() {
    log('Parsing membrane structure from visual editor...', 'info');
    const membranes = new Map();
    function processVisualElement(element, parentId = null) {
        const membraneId = element.dataset.membraneId;
        const charge = element.querySelector('.membrane-charge-input').value;
        const objectsStr = element.querySelector('.membrane-objects-input').value;
        const objects = parseMultiset(objectsStr);
        if (membranes.has(membraneId)) {
            log(`Warning: Duplicate membrane ID '${membraneId}'.`, 'warn');
            return;
        }
        const membraneData = {
            id: membraneId,
            label: membraneId,
            charge: charge,
            objects: objects,
            parentId: parentId,
            childrenIds: []
        };
        membranes.set(membraneId, membraneData);
        if (parentId && membranes.has(parentId)) {
            membranes.get(parentId).childrenIds.push(membraneId);
        }
        const contentArea = element.querySelector('.membrane-content');
        if (contentArea) {
            Array.from(contentArea.children)
                .filter(c => c.classList.contains('membrane-draggable'))
                .forEach(childEl => processVisualElement(childEl, membraneId));
        }
    }
    Array.from(visualEditorArea.children)
        .filter(c => c.classList.contains('membrane-draggable'))
        .forEach(rootEl => processVisualElement(rootEl, null));
    if (membranes.size === 0) {
        log("No membranes in visual editor.", "warn");
    } else {
        log(`Parsed ${membranes.size} membranes visually.`, "info");
    }
    return membranes;
}

// --- Live Rule Parsing ---
function updateLiveParse() {
    const text = rulesTextarea.value;
    const rows = window.ActiveMembraneParser.parseRulesText(text);
    renderParseTable(rows);
}

function renderParseTable(rows) {
    parseResultsContainer.innerHTML = '';
    if (rows.length === 0) {
        parseResultsContainer.innerHTML = '<p class="copy-note p-3">No rules defined.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'parser-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Source Line</th>
                <th>Type</th>
                <th>Status</th>
                <th>Diagnostics</th>
            </tr>
        </thead>
        <tbody id="parse-table-body"></tbody>
    `;
    const tbody = table.querySelector('#parse-table-body');

    rows.forEach(row => {
        const tr = document.createElement('tr');
        const idCell = document.createElement('td');
        idCell.textContent = row.id;
        idCell.style.fontWeight = '800';

        const sourceCell = document.createElement('td');
        sourceCell.className = 'source-cell';
        sourceCell.title = row.source;
        sourceCell.textContent = row.source;

        const typeCell = document.createElement('td');
        typeCell.textContent = row.rule ? row.rule.type : 'N/A';

        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge status-${row.status}`;
        statusBadge.textContent = row.status === 'pass' ? 'Pass' : row.status === 'fail' ? 'Fail' : 'Blocked';
        statusCell.appendChild(statusBadge);

        const diagnosticCell = document.createElement('td');
        diagnosticCell.className = row.status === 'fail' ? 'status-fail' : '';
        diagnosticCell.textContent = row.diagnostic || '';

        tr.append(idCell, sourceCell, typeCell, statusCell, diagnosticCell);
        tbody.appendChild(tr);
    });

    parseResultsContainer.appendChild(table);
}

rulesTextarea.addEventListener('input', updateLiveParse);

// --- Analysis Results Rendering ---
function setResultsMessage(message, className = 'text-gray-600') {
    const paragraph = document.createElement('p');
    paragraph.className = className;
    paragraph.textContent = message;
    resultsDisplayEl.replaceChildren(paragraph);
}

function renderFormalMaximalSets(maximalSets, rulesById) {
    resultsDisplayEl.replaceChildren();

    if (maximalSets.length === 0) {
        setResultsMessage('No maximally parallel sets found.');
        return;
    }

    maximalSets.forEach((set, index) => {
        const setDiv = document.createElement('div');
        setDiv.classList.add('result-item');

        const heading = document.createElement('h3');
        heading.className = 'font-semibold text-gray-700';
        heading.textContent = `Set ${index + 1}:`;
        setDiv.appendChild(heading);

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'mt-1';

        set.counts.forEach((count, ruleId) => {
            const rule = rulesById.get(ruleId);
            if (!rule) return;

            const tag = document.createElement('span');
            tag.className = 'rule-tag';
            tag.title = rule.raw || '';
            tag.textContent = `${rule.displayLabel} x ${count} (${rule.raw})`;
            tagsContainer.appendChild(tag);
        });

        setDiv.appendChild(tagsContainer);
        resultsDisplayEl.appendChild(setDiv);
    });
}

// --- Event Listener for Analysis ---
analyzeBtnEl.addEventListener('click', () => {
    clearError();
    setResultsMessage('Analyzing...', 'text-gray-500');
    log('--- Analysis Started ---', 'info');

    const membranes = parseMembraneStructureFromVisual();
    if (!membranes || membranes.size === 0) {
        displayErrorText("Failed to parse membranes. Ensure membranes are defined.");
        setResultsMessage('Error parsing membranes.', 'text-red-500');
        return;
    }

    const text = rulesTextarea.value;
    const rows = window.ActiveMembraneParser.parseRulesText(text);

    // Re-render parse results table in case it was modified
    renderParseTable(rows);

    const analysis = window.ActiveMembraneAnalysis.analyzeOneStep(membranes, rows, { allowElementaryDivision: false });

    if (analysis.status === 'fail' || analysis.status === 'blocked') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message p-3 bg-red-100 border border-red-300 rounded-md';
        const strong = document.createElement('strong');
        strong.textContent = `Analysis ${analysis.status.toUpperCase()}:`;
        errorDiv.appendChild(strong);
        analysis.diagnostics.forEach(diagnostic => {
            errorDiv.appendChild(document.createElement('br'));
            errorDiv.appendChild(document.createTextNode(diagnostic));
        });
        errorDisplayEl.replaceChildren(errorDiv);
        setResultsMessage(`Analysis ${analysis.status}ed due to errors.`, 'text-red-500');
        log(`Analysis ${analysis.status}ed with diagnostics.`, 'error');
        return;
    }

    log(`Enumerating maximally parallel sets...`, 'info');
    const rulesById = new Map((analysis.formalRules || []).map(rule => [rule.id, rule]));
    renderFormalMaximalSets(analysis.maximalSets, rulesById);
    log('--- Analysis Complete ---', 'info');
});

// --- Example Loader ---
function loadExampleFromScreenshotVisual() {
    visualEditorArea.innerHTML = '';
    nextMembraneNumericId = 1;

    const mem10 = createNewVisualMembrane(visualEditorArea, '10', '0', '');
    const mem9 = createNewVisualMembrane(mem10, '9', '0', '');
    const mem3 = createNewVisualMembrane(mem9, '3', '0', '');
    createNewVisualMembrane(mem3, '1', '+', '');
    createNewVisualMembrane(mem3, '2', '-', '');
    const mem4 = createNewVisualMembrane(mem9, '4', '-', 'a:1');
    createNewVisualMembrane(mem4, '6', '+', '');
    createNewVisualMembrane(mem4, '7', '-', '');
    const mem5 = createNewVisualMembrane(mem9, '5', '-', '');
    createNewVisualMembrane(mem5, '8', '+', '');
    mem9.querySelector('.membrane-objects-input').value = 'b:1';
    
    const maxIdNum = ['1','2','3','4','5','6','7','8','9','10']
        .map(id => parseInt(id.match(/\d+/)?.[0] || '0'))
        .reduce((max, curr) => Math.max(max, curr), 0);
    nextMembraneNumericId = maxIdNum + 1;

    rulesTextarea.value = `# Rules from Figure 2
b [5]^- -> [5 b]^+
a [7]^- -> [7 a]^+
[3 [1]^+ [2]^-]^0 -> [3 [1]^0]^0 [3 [2]^0]^0
[4 [6]^+ [7]^-]^- -> [4 [6]^+]^- [4 [7]^+]^-`;

    updateLiveParse();
    log("Figure 2 active-membrane example loaded.", "info");
}

// Bind the core functions to window to keep backward compatibility with the iframe integrations and the automated smoke tests
window.parseMembraneStructureFromVisual = parseMembraneStructureFromVisual;
window.createNewVisualMembrane = createNewVisualMembrane;

document.addEventListener('DOMContentLoaded', () => {
    log('Application initialized.');
    loadExampleFromScreenshotVisual(); 
});
