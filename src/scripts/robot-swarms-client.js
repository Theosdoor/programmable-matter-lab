// --- Global State ---
        let gridSize = 11; 
        let gridState = [];
        let initialGridStateForShare = null; 
        let targetGridState = null;
        const SwarmMode = {
            _current: 'SETUP_INITIAL',
            get current() { return this._current; },
            is(s) { return this._current === s; },
            isTransforming() { return this._current.startsWith('TRANSFORM_'); },
            startTargetSetup()      { this._current = 'TARGET_SETUP'; },
            finishTargetSetup()     { this._current = 'SETUP_INITIAL'; },
            beginTransform()        { this._current = 'TRANSFORM_SELECT_ROTATING'; },
            exitTransform()         { this._current = 'SETUP_INITIAL'; },
            backToSelectRotating()  { this._current = 'TRANSFORM_SELECT_ROTATING'; },
            selectRotatingNode()    { this._current = 'TRANSFORM_SELECT_PIVOT'; },
            selectPivot()           { this._current = 'TRANSFORM_SELECT_DESTINATION'; },
            deselectPivot()         { this._current = 'TRANSFORM_SELECT_PIVOT'; },
            force(s)                { this._current = s; },
        };
        let selectedRotatingNode = null;
        let selectedPivotNode = null;
        let potentialPivots = [];
        let potentialDestinations = []; 
        let potentialDoubleDestinations = []; 
        let moveHistory = []; 
        
        // --- DOM Elements ---
        const gridSizeInput = document.getElementById('gridSize');
        const generateGridBtn = document.getElementById('generateGridBtn');
        const defineTargetBtn = document.getElementById('defineTargetBtn');
        const clearTargetBtn = document.getElementById('clearTargetBtn');
        const startTransformBtn = document.getElementById('startTransformBtn');
        const undoBtn = document.getElementById('undoBtn');
        const resetTransformBtn = document.getElementById('resetTransformBtn');
        const restartBtn = document.getElementById('restartBtn');
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        const gridContainer = document.getElementById('gridContainer');
        const colLabelContainer = document.getElementById('colLabelContainer');
        const rowLabelContainer = document.getElementById('rowLabelContainer');
        const messageBox = document.getElementById('messageBox');
        const rotationSequenceList = document.getElementById('rotationSequence');

        // --- Coordinate Display Helper ---
        function toDisplayCoords(r, c) {
            return { x: c, y: (gridSize - 1) - r };
        }
        function displayCoordsStr(r,c){
            const dc = toDisplayCoords(r,c);
            return `(${dc.x},${dc.y})`;
        }


        // --- Initialization ---
        function initializeApp() {
            loadStateFromURL(); 
            if (!gridState || gridState.length === 0) { 
                 initializeGrid(gridSize);
            } else { 
                initializeGridUI(gridSize); 
                renderGrid(); 
                updateRotationSequence();
                updateButtonStates();
                messageBox.textContent = "Loaded shared transformation. You can undo or continue.";
            }
        }
        
        function initializeGridUI(size) {
            gridContainer.innerHTML = '';
            gridContainer.style.gridTemplateColumns = `repeat(${size}, 40px)`;
            
            colLabelContainer.innerHTML = '';
            colLabelContainer.style.gridTemplateColumns = `repeat(${size}, 40px)`;
            rowLabelContainer.innerHTML = '';
            rowLabelContainer.style.gridTemplateRows = `repeat(${size}, 40px)`;

            for (let i = 0; i < size; i++) {
                const colLabel = document.createElement('div');
                colLabel.classList.add('label-cell');
                colLabel.textContent = i; // X-coordinate (0 to N-1)
                colLabelContainer.appendChild(colLabel);

                const rowLabel = document.createElement('div');
                rowLabel.classList.add('label-cell');
                rowLabel.textContent = (size - 1) - i; // Y-coordinate (N-1 down to 0 for display)
                rowLabelContainer.appendChild(rowLabel);
            }
            
            for (let r_ui = 0; r_ui < size; r_ui++) {
                for (let c_ui = 0; c_ui < size; c_ui++) {
                    const cell = document.createElement('div');
                    cell.classList.add('grid-cell');
                    cell.dataset.r = r_ui; 
                    cell.dataset.c = c_ui; 
                    cell.addEventListener('click', handleCellClick); 
                    gridContainer.appendChild(cell);
                }
            }
        }


        function initializeGrid(size, isContinuation = false) {
            if (size % 2 === 0) {
                messageBox.textContent = "Grid size must be an odd number.";
                messageBox.className = 'info-box mt-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm';
                gridSizeInput.value = gridSize; 
                return;
            }
            gridSize = size; 
            messageBox.className = 'info-box mt-2 p-3 bg-blue-100 border border-blue-300 text-blue-700 rounded-md text-sm'; 

            if (!isContinuation || SwarmMode.is('SETUP_INITIAL')) { 
                gridState = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
                initialGridStateForShare = JSON.parse(JSON.stringify(gridState)); 
            }
            if (SwarmMode.is('TARGET_SETUP') && !targetGridState) {
                targetGridState = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
            }
            
            initializeGridUI(gridSize); 

            updateRotationSequence();
            renderGrid();
            updateButtonStates();
            if (SwarmMode.is('SETUP_INITIAL'))  messageBox.textContent = `Click cells to place nodes for the initial shape. Bottom-left is (0,0), top-right is (${gridSize-1},${gridSize-1}).`;
        }
        
        // --- Rendering ---
        function renderGrid() {
            const centerIdx = Math.floor(gridSize / 2);

            for (let r_render = 0; r_render < gridSize; r_render++) {
                for (let c_render = 0; c_render < gridSize; c_render++) {
                    const cellElement = gridContainer.querySelector(`[data-r='${r_render}'][data-c='${c_render}']`);
                    if (!cellElement) continue; 
                    cellElement.innerHTML = '';
                    cellElement.className = 'grid-cell'; 

                    if (r_render === centerIdx && c_render === centerIdx) {
                        cellElement.classList.add('grid-cell-center');
                    }

                    if (SwarmMode.is('TARGET_SETUP')) {
                        if (targetGridState && targetGridState[r_render][c_render]) {
                            const nodeDiv = document.createElement('div');
                            nodeDiv.classList.add('node', targetGridState[r_render][c_render].color === 'red' ? 'node-red' : 'node-black');
                            cellElement.appendChild(nodeDiv);
                        }
                    } else {
                        if (targetGridState && targetGridState[r_render][c_render]) {
                            const ghostNodeDiv = document.createElement('div');
                            ghostNodeDiv.classList.add('node-ghost', targetGridState[r_render][c_render].color === 'red' ? 'node-red-ghost' : 'node-black-ghost');
                            cellElement.appendChild(ghostNodeDiv);
                        }
                        if (gridState[r_render] && gridState[r_render][c_render]) {
                            const nodeDiv = document.createElement('div');
                            if(cellElement.querySelector('.node-ghost')) cellElement.querySelector('.node-ghost').style.zIndex = '0';
                            nodeDiv.style.zIndex = '1'; 
                            nodeDiv.classList.add('node', gridState[r_render][c_render].color === 'red' ? 'node-red' : 'node-black');
                            cellElement.appendChild(nodeDiv);
                        }
                    }

                    if (SwarmMode.isTransforming()) {
                        if (selectedRotatingNode && selectedRotatingNode.r === r_render && selectedRotatingNode.c === c_render) cellElement.classList.add('highlight-rotating');
                        if (SwarmMode.is('TRANSFORM_SELECT_PIVOT') && potentialPivots.some(p => p.r === r_render && p.c === c_render)) cellElement.classList.add('highlight-potential-pivot');
                        if (selectedPivotNode && selectedPivotNode.r === r_render && selectedPivotNode.c === c_render) cellElement.classList.add('highlight-pivot');
                        
                        potentialDestinations.forEach(dest => {
                            if (dest.r === r_render && dest.c === c_render) cellElement.classList.add('highlight-destination');
                        });
                        potentialDoubleDestinations.forEach(dd => {
                            if (dd.finalR === r_render && dd.finalC === c_render) cellElement.classList.add('highlight-double-destination');
                        });
                    }
                }
            }
        }

        // --- UI State Management ---
        function updateRotationSequence() {
            rotationSequenceList.innerHTML = '';
            const miniGridCenterIdx = Math.floor(gridSize / 2); 

            if (moveHistory.length === 0) {
                rotationSequenceList.innerHTML = '<li class="italic text-gray-500">No rotations made yet.</li>';
            } else {
                moveHistory.forEach((move, index) => {
                    const li = document.createElement('li');
                    
                    const textDiv = document.createElement('div');
                    textDiv.textContent = `${index + 1}: ${move.moveDetails}`; 
                    li.appendChild(textDiv);

                    const miniGridDiv = document.createElement('div');
                    miniGridDiv.classList.add('mini-grid-container');
                    miniGridDiv.style.gridTemplateColumns = `repeat(${gridSize}, 10px)`;

                    const stateToRender = move.toState; 

                    for (let r_mini = 0; r_mini < gridSize; r_mini++) {
                        for (let c_mini = 0; c_mini < gridSize; c_mini++) {
                            const miniCell = document.createElement('div');
                            miniCell.classList.add('mini-grid-cell');
                            if (r_mini === miniGridCenterIdx && c_mini === miniGridCenterIdx) {
                                miniCell.classList.add('mini-grid-cell-center');
                            }

                            if (stateToRender[r_mini] && stateToRender[r_mini][c_mini]) {
                                const miniNode = document.createElement('div');
                                miniNode.classList.add('mini-node', stateToRender[r_mini][c_mini].color === 'red' ? 'mini-node-red' : 'mini-node-black');
                                miniCell.appendChild(miniNode);
                            }
                            miniGridDiv.appendChild(miniCell);
                        }
                    }
                    li.appendChild(miniGridDiv);
                    rotationSequenceList.appendChild(li);
                });
            }
        }

        function updateButtonStates() {
            const hasInitialNodes = gridState.flat().some(cell => cell !== null);
            const hasTargetNodes = targetGridState && targetGridState.flat().some(cell => cell !== null);

            startTransformBtn.textContent = SwarmMode.isTransforming() ? 'Return to Setup' : 'Start Transformation';
            startTransformBtn.disabled = SwarmMode.is('TARGET_SETUP') || (!hasInitialNodes && !SwarmMode.isTransforming());
            
            undoBtn.disabled = moveHistory.length === 0;
            resetTransformBtn.disabled = moveHistory.length === 0; // Enabled only if there's history
            defineTargetBtn.textContent = SwarmMode.is('TARGET_SETUP') ? 'Finish Defining Target' : 'Define Target Shape';
            clearTargetBtn.disabled = !hasTargetNodes;
            gridSizeInput.disabled = !SwarmMode.is('SETUP_INITIAL');
            generateGridBtn.disabled = !SwarmMode.is('SETUP_INITIAL');
        }
        
        // --- Event Handlers ---
        gridSizeInput.addEventListener('change', () => { 
            let size = parseInt(gridSizeInput.value);
            if (size % 2 === 0) {
                messageBox.textContent = "Grid size must be an odd number. Adjusting to nearest valid odd number.";
                messageBox.className = 'info-box mt-2 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm';
                size = size + 1 > 21 ? size - 1 : size + 1; 
                if (size < 3) size = 3;
                gridSizeInput.value = size;
            }
        });

        generateGridBtn.addEventListener('click', () => { 
            const size = parseInt(gridSizeInput.value);
            if (size % 2 === 0) {
                 messageBox.textContent = "Grid size must be an odd number. Please correct.";
                 messageBox.className = 'info-box mt-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm';
                 return;
            }
            gridSizeInput.value = size;
            gridSize = size;
            resetState(); 
        });
        restartBtn.addEventListener('click', () => { 
            window.location.hash = ''; 
            resetState(); 
        });

        resetTransformBtn.addEventListener('click', () => {
            if (initialGridStateForShare) {
                gridState = JSON.parse(JSON.stringify(initialGridStateForShare));
                moveHistory = [];
                clearTransformState(true);
                if (!SwarmMode.isTransforming()) SwarmMode.exitTransform();
                if (SwarmMode.is('SETUP_INITIAL') && gridState.flat().some(n=>n)) SwarmMode.beginTransform();
                
                messageBox.textContent = 'Transformation reset to initial shape.';
                renderGrid();
                updateRotationSequence();
                updateButtonStates();
            } else {
                messageBox.textContent = 'No initial transformation state to reset to.';
            }
        });


        defineTargetBtn.addEventListener('click', () => {
            if (SwarmMode.is('TARGET_SETUP')) {
                SwarmMode.finishTargetSetup();
                messageBox.textContent = (targetGridState && targetGridState.flat().some(n => n)) ? 'Target shape defined. Define/modify initial shape or start transformation.' : 'Target definition cleared. Define an initial shape.';
            } else {
                SwarmMode.startTargetSetup();
                messageBox.textContent = 'Defining Target Shape: Click cells to place nodes. Click "Finish Defining Target" when done.';
            }
            initializeGrid(gridSize, true); 
        });

        clearTargetBtn.addEventListener('click', () => {
            targetGridState = null;
            messageBox.textContent = 'Target shape cleared.';
            updateButtonStates();
            renderGrid();
        });

        startTransformBtn.addEventListener('click', () => {
            if (SwarmMode.isTransforming()) {
                SwarmMode.exitTransform();
                clearTransformState();
                initialGridStateForShare = JSON.parse(JSON.stringify(gridState));
                messageBox.textContent = 'Returned to setup mode. You can edit the initial shape.';
            } else {
                if (!isShapeConnected(gridState)) {
                    messageBox.textContent = 'Initial shape must be a single connected component to start transformation.';
                    return;
                }
                initialGridStateForShare = JSON.parse(JSON.stringify(gridState));
                SwarmMode.beginTransform();
                messageBox.textContent = 'Transformation Mode: Select a node to rotate.';
            }
            updateButtonStates();
            renderGrid();
        });

        undoBtn.addEventListener('click', () => {
            if (moveHistory.length > 0) {
                const lastMove = moveHistory.pop();
                gridState = JSON.parse(JSON.stringify(lastMove.fromState));
                clearTransformState(true);
                SwarmMode.backToSelectRotating();
                messageBox.textContent = 'Last rotation undone. Select a node to rotate.';
                renderGrid();
                updateRotationSequence();
                updateButtonStates();
            }
        });
        
        copyLinkBtn.addEventListener('click', generateAndCopyShareUrl);


        function handleCellClick(event) {
            const r_click = parseInt(event.currentTarget.dataset.r);
            const c_click = parseInt(event.currentTarget.dataset.c);

            if (SwarmMode.is('SETUP_INITIAL')) {
                toggleNodeInGrid(r_click, c_click, gridState);
                initialGridStateForShare = JSON.parse(JSON.stringify(gridState)); 
            } else if (SwarmMode.is('TARGET_SETUP')) {
                toggleNodeInGrid(r_click, c_click, targetGridState);
            } else if (SwarmMode.isTransforming()) {
                processTransformClick(r_click, c_click);
            }
            updateButtonStates(); 
            renderGrid(); 
        }


        function processTransformClick(r_proc, c_proc) {
            if (SwarmMode.is('TRANSFORM_SELECT_ROTATING')) {
                if (gridState[r_proc][c_proc]) {
                    selectedRotatingNode = { r: r_proc, c: c_proc };
                    SwarmMode.selectRotatingNode();
                    potentialPivots = getPotentialPivots(selectedRotatingNode, gridState);
                    messageBox.textContent = potentialPivots.length > 0 ? `Node at ${displayCoordsStr(r_proc,c_proc)} selected. Select a YELLOW highlighted pivot.` : `Node at ${displayCoordsStr(r_proc,c_proc)} selected, but no valid pivots. Click node to deselect.`;
                }
            } else if (SwarmMode.is('TRANSFORM_SELECT_PIVOT')) {
                if (selectedRotatingNode && selectedRotatingNode.r === r_proc && selectedRotatingNode.c === c_proc) {
                    clearTransformState(true);
                    SwarmMode.backToSelectRotating();
                    messageBox.textContent = 'Rotating node deselected. Select a new node.';
                } else if (gridState[r_proc][c_proc] && potentialPivots.some(p => p.r === r_proc && p.c === c_proc)) {
                    selectedPivotNode = { r: r_proc, c: c_proc };
                    potentialPivots = []; 
                    calculatePotentialDestinationsAndDouble(gridState, selectedRotatingNode, selectedPivotNode);
                    SwarmMode.selectPivot();
                    messageBox.textContent = (potentialDestinations.length > 0 || potentialDoubleDestinations.length > 0) ? `Pivot at ${displayCoordsStr(r_proc,c_proc)} selected. Click BLUE (single) or PURPLE (double) cell to rotate.` : `Pivot at ${displayCoordsStr(r_proc,c_proc)} selected, but no valid moves. Click pivot to deselect.`;
                }
            } else if (SwarmMode.is('TRANSFORM_SELECT_DESTINATION')) {
                const doubleDest = potentialDoubleDestinations.find(dd => dd.finalR === r_proc && dd.finalC === c_proc);
                const singleDest = potentialDestinations.find(d => d.r === r_proc && d.c === c_proc);

                if (doubleDest) {
                    performDoubleRotation(doubleDest);
                } else if (singleDest) {
                    performSingleRotation(singleDest.r, singleDest.c, singleDest.dir);
                } else if (selectedPivotNode && selectedPivotNode.r === r_proc && selectedPivotNode.c === c_proc) { 
                    selectedPivotNode = null;
                    potentialDestinations = [];
                    potentialDoubleDestinations = [];
                    SwarmMode.deselectPivot();
                    potentialPivots = getPotentialPivots(selectedRotatingNode, gridState);
                    messageBox.textContent = `Pivot deselected. Select a new YELLOW highlighted pivot for node ${displayCoordsStr(selectedRotatingNode.r, selectedRotatingNode.c)}.`;
                } else if (selectedRotatingNode && selectedRotatingNode.r === r_proc && selectedRotatingNode.c === c_proc) {
                    clearTransformState(true);
                    SwarmMode.backToSelectRotating();
                    messageBox.textContent = 'Selection cleared. Select a node to rotate.';
                }
                 if (doubleDest || singleDest) { 
                    if (checkWinCondition()) {
                        messageBox.textContent = `Congratulations! Shape matches the target. Last move: ${moveHistory[moveHistory.length-1].moveDetails}`;
                    } else {
                        messageBox.textContent = 'Rotation complete. Select next node to rotate.';
                    }
                }
            }
        }


        // --- Game Logic & Helpers ---
        function clearTransformState(keepMode = false) {
            selectedRotatingNode = null;
            selectedPivotNode = null;
            potentialPivots = [];
            potentialDestinations = [];
            potentialDoubleDestinations = [];
            if (!keepMode) SwarmMode.exitTransform();
        }

        function getPotentialPivots(rotatingNode, currentGrid) {
            const pivots = [];
            if (!rotatingNode) return pivots;
            const deltas = [{dr:-1, dc:0}, {dr:1, dc:0}, {dr:0, dc:-1}, {dr:0, dc:1}];
            deltas.forEach(delta => {
                const pr = rotatingNode.r + delta.dr;
                const pc = rotatingNode.c + delta.dc;
                if (pr >= 0 && pr < gridSize && pc >= 0 && pc < gridSize && currentGrid[pr] && currentGrid[pr][pc]) {
                    const tempDests = calculateSingleRotationDestinations(currentGrid, rotatingNode, {r: pr, c: pc});
                    if (tempDests.length > 0) {
                        pivots.push({r: pr, c: pc});
                    }
                }
            });
            return pivots;
        }

        function toggleNodeInGrid(r_toggle, c_toggle, gridArray) {
            if (!gridArray) return;
            gridArray[r_toggle][c_toggle] = gridArray[r_toggle][c_toggle] ? null : { color: (r_toggle + c_toggle) % 2 === 0 ? 'black' : 'red' };
        }
        
        function calculateSingleRotationDestinations(currentGrid, rotatingN, pivotN) {
            const destinations = [];
            if (!rotatingN || !pivotN) return destinations;
            const { r: rr, c: rc } = rotatingN;
            const { r: pr, c: pc } = pivotN;
            let moves = [];
            if (pr === rr && pc === rc + 1) { 
                moves.push({ dir: 'cw',  tr: rr + 1, tc: rc, dr: rr + 1, dc: rc + 1 }, { dir: 'ccw', tr: rr - 1, tc: rc, dr: rr - 1, dc: rc + 1 });
            } else if (pr === rr && pc === rc - 1) { 
                moves.push({ dir: 'cw',  tr: rr - 1, tc: rc, dr: rr - 1, dc: rc - 1 }, { dir: 'ccw', tr: rr + 1, tc: rc, dr: rr + 1, dc: rc - 1 });
            } else if (pr === rr + 1 && pc === rc) { 
                moves.push({ dir: 'cw',  tr: rr, tc: rc - 1, dr: rr + 1, dc: rc - 1 }, { dir: 'ccw', tr: rr, tc: rc + 1, dr: rr + 1, dc: rc + 1 });
            } else if (pr === rr - 1 && pc === rc) { 
                moves.push({ dir: 'cw',  tr: rr, tc: rc + 1, dr: rr - 1, dc: rc + 1 }, { dir: 'ccw', tr: rr, tc: rc - 1, dr: rr - 1, dc: rc - 1 });
            }

            moves.forEach(move => {
                const { tr, tc, dr, dc, dir } = move;
                const isTransitValid = tr >= 0 && tr < gridSize && tc >= 0 && tc < gridSize && (!currentGrid[tr] || !currentGrid[tr][tc]);
                const isDestinationValid = dr >= 0 && dr < gridSize && dc >= 0 && dc < gridSize && (!currentGrid[dr] || !currentGrid[dr][dc]);
                if (isTransitValid && isDestinationValid) destinations.push({ r: dr, c: dc, dir: dir, intermediateR: tr, intermediateC: tc });
            });
            return destinations;
        }

        function calculatePotentialDestinationsAndDouble(currentGrid, rotatingN, pivotN) {
            potentialDestinations = calculateSingleRotationDestinations(currentGrid, rotatingN, pivotN);
            potentialDoubleDestinations = [];

            potentialDestinations.forEach(firstMove => {
                let tempGrid = JSON.parse(JSON.stringify(currentGrid));
                const rotatingNodeData = tempGrid[rotatingN.r][rotatingN.c];
                tempGrid[rotatingN.r][rotatingN.c] = null;
                tempGrid[firstMove.r][firstMove.c] = rotatingNodeData; 

                const secondMoves = calculateSingleRotationDestinations(tempGrid, {r: firstMove.r, c: firstMove.c}, pivotN);
                
                secondMoves.forEach(secondM => {
                    if (secondM.dir === firstMove.dir) { 
                        potentialDoubleDestinations.push({
                            finalR: secondM.r, finalC: secondM.c,
                            intermediateR: firstMove.r, intermediateC: firstMove.c,
                            firstDir: firstMove.dir, secondDir: secondM.dir, 
                            firstTransitR: firstMove.intermediateR, firstTransitC: firstMove.intermediateC,
                            secondTransitR: secondM.intermediateR, secondTransitC: secondM.intermediateC,
                        });
                    }
                });
            });
        }
        
        function isShapeConnected(currentGrid) {
            const nodes = [];
            for(let r_conn = 0; r_conn < gridSize; r_conn++) for(let c_conn = 0; c_conn < gridSize; c_conn++) if(currentGrid[r_conn] && currentGrid[r_conn][c_conn]) nodes.push({r:r_conn,c:c_conn});
            if (nodes.length <= 1) return true;
            const visited = new Set();
            const queue = [nodes[0]];
            visited.add(`${nodes[0].r},${nodes[0].c}`);
            let head = 0;
            while(head < queue.length) {
                const current = queue[head++];
                const deltas = [{dr:-1, dc:0}, {dr:1, dc:0}, {dr:0, dc:-1}, {dr:0, dc:1}];
                for(const delta of deltas) {
                    const nr = current.r + delta.dr;
                    const nc = current.c + delta.dc;
                    if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && currentGrid[nr] && currentGrid[nr][nc]) {
                        const key = `${nr},${nc}`;
                        if (!visited.has(key)) {
                            visited.add(key);
                            queue.push({r: nr, c: nc});
                        }
                    }
                }
            }
            return visited.size === nodes.length;
        }
        
        function performSingleRotation(destR, destC, direction, currentRotatingNode = selectedRotatingNode, currentPivotNode = selectedPivotNode, addToHistory = true) {
            const originalNodePos = { r: currentRotatingNode.r, c: currentRotatingNode.c };
            const pivotPos = { r: currentPivotNode.r, c: currentPivotNode.c };

            const currentGridStateCopy = JSON.parse(JSON.stringify(gridState));
            const rotatingNodeData = JSON.parse(JSON.stringify(gridState[currentRotatingNode.r][currentRotatingNode.c]));
            
            gridState[currentRotatingNode.r][currentRotatingNode.c] = null;
            gridState[destR][destC] = { ...rotatingNodeData, color: (destR + destC) % 2 === 0 ? 'black' : 'red' };
            
            if (addToHistory) {
                const moveDetailString = `Node from ${displayCoordsStr(originalNodePos.r, originalNodePos.c)} rotated ${direction} around ${displayCoordsStr(pivotPos.r, pivotPos.c)} to ${displayCoordsStr(destR, destC)}.`;
                const stateAfterRotation = JSON.parse(JSON.stringify(gridState));
                moveHistory.push({ 
                    fromState: currentGridStateCopy, 
                    toState: stateAfterRotation,
                    moveDetails: moveDetailString 
                });
                updateRotationSequence();
            }

            if (addToHistory) {
                clearTransformState(true);
                SwarmMode.backToSelectRotating();
            }
            return {r: destR, c: destC}; 
        }

        function performDoubleRotation(doubleDest) {
            const originalRotatingR = selectedRotatingNode.r;
            const originalRotatingC = selectedRotatingNode.c;
            const pivotR = selectedPivotNode.r;
            const pivotC = selectedPivotNode.c;

            const stateBeforeFirstRot = JSON.parse(JSON.stringify(gridState));
            performSingleRotation(doubleDest.intermediateR, doubleDest.intermediateC, doubleDest.firstDir, {r: originalRotatingR, c: originalRotatingC} , {r:pivotR, c:pivotC}, false);
            const stateAfterFirstRot = JSON.parse(JSON.stringify(gridState)); 
            
            let currentRotatingNodeForSecondMove = { r: doubleDest.intermediateR, c: doubleDest.intermediateC };
            
            const stateBeforeSecondRot = JSON.parse(JSON.stringify(gridState)); 
            performSingleRotation(doubleDest.finalR, doubleDest.finalC, doubleDest.secondDir, currentRotatingNodeForSecondMove, {r:pivotR, c:pivotC}, false);
            const stateAfterSecondRot = JSON.parse(JSON.stringify(gridState)); 

            const firstMoveDetails = `1/2: Node from ${displayCoordsStr(originalRotatingR,originalRotatingC)} rotated ${doubleDest.firstDir} around ${displayCoordsStr(pivotR,pivotC)} to ${displayCoordsStr(doubleDest.intermediateR,doubleDest.intermediateC)}.`;
            moveHistory.push({ fromState: stateBeforeFirstRot, toState: stateAfterFirstRot, moveDetails: firstMoveDetails });
            
            const secondMoveDetails = `2/2: Node from ${displayCoordsStr(doubleDest.intermediateR,doubleDest.intermediateC)} rotated ${doubleDest.secondDir} around ${displayCoordsStr(pivotR,pivotC)} to ${displayCoordsStr(doubleDest.finalR,doubleDest.finalC)}.`;
            moveHistory.push({ fromState: stateBeforeSecondRot, toState: stateAfterSecondRot, moveDetails: secondMoveDetails });
            
            updateRotationSequence();

            clearTransformState(true);
            SwarmMode.backToSelectRotating();
        }

        function checkWinCondition() {
            if (!targetGridState || !targetGridState.flat().some(n => n)) return false; 
            for (let r_check = 0; r_check < gridSize; r_check++) {
                for (let c_check = 0; c_check < gridSize; c_check++) {
                    const initialNode = (gridState[r_check] && gridState[r_check][c_check]) ? gridState[r_check][c_check] : null;
                    const targetNode = (targetGridState[r_check] && targetGridState[r_check][c_check]) ? targetGridState[r_check][c_check] : null;
                    if (!!initialNode !== !!targetNode) return false; 
                }
            }
            return true;
        }

        function resetState() {
            gridState = [];
            initialGridStateForShare = null;
            targetGridState = null;
            moveHistory = [];
            clearTransformState(); 
            initializeGrid(parseInt(gridSizeInput.value)); 
            messageBox.textContent = `Set grid size (odd number) and click "Generate Grid". Then, click cells to place nodes for the initial shape. Bottom-left is (0,0), top-right is (${gridSize-1},${gridSize-1}).`;
        }
        
        function loadStateFromURL() {
            if (window.location.hash.startsWith('#share=')) {
                const base64Data = window.location.hash.substring(7); 
                try {
                    const jsonString = atob(base64Data);
                    const loadedData = JSON.parse(jsonString);

                    gridSize = loadedData.gridSize || 11; 
                    gridSizeInput.value = gridSize;
                    
                    initialGridStateForShare = loadedData.initialState || Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
                    targetGridState = loadedData.targetState || null;
                    const loadedHistory = Array.isArray(loadedData.history) ? loadedData.history : [];
                    moveHistory = loadedHistory.map(h => ({
                        fromState: h.from, 
                        toState: h.to,
                        moveDetails: h.details 
                    }));

                    if (moveHistory.length > 0) {
                        gridState = JSON.parse(JSON.stringify(moveHistory[moveHistory.length - 1].toState));
                    } else {
                        gridState = JSON.parse(JSON.stringify(initialGridStateForShare));
                    }

                    SwarmMode.force('TRANSFORM_SELECT_ROTATING');
                    if (moveHistory.length === 0 && gridState.flat().every(n=>n===null)) {
                        SwarmMode.force('SETUP_INITIAL');
                    }
                    
                    initializeGridUI(gridSize); 
                    renderGrid(); 
                    updateRotationSequence(); 
                    updateButtonStates();
                    messageBox.textContent = "Loaded shared transformation. You can undo or continue transforming.";
                    window.location.hash = ''; 
                    return true; 
                } catch (e) {
                    console.error("Error loading state from URL:", e);
                    messageBox.textContent = "Error loading shared transformation. Starting fresh.";
                    messageBox.className = 'info-box mt-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm';
                    gridState = []; 
                }
            }
            return false;
        }

        function generateAndCopyShareUrl() {
            const shareData = {
                gridSize: gridSize,
                initialState: initialGridStateForShare || gridState,
                targetState: targetGridState,
                history: moveHistory.map(m => ({ details: m.moveDetails, from: m.fromState, to: m.toState }))
            };
            try {
                const jsonString = JSON.stringify(shareData);
                const base64String = btoa(jsonString);
                const shareUrl = `${window.location.origin}${window.location.pathname}#share=${base64String}`;
                
                navigator.clipboard.writeText(shareUrl).then(() => {
                    messageBox.textContent = "Share link copied to clipboard!";
                    prompt("Share link (also copied to clipboard):", shareUrl);
                }).catch(err => {
                    console.error('Failed to copy link: ', err);
                    prompt("Could not auto-copy. Please copy this link manually:", shareUrl);
                    messageBox.textContent = "Share link generated. Please copy from the prompt.";
                });
            } catch (e) {
                console.error("Error generating share link:", e);
                messageBox.textContent = "Error generating share link.";
                messageBox.className = 'info-box mt-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm';
            }
        }

        // --- Expose globals on window for external access & tests ---
        Object.defineProperty(window, 'gridSize', {
            get: () => gridSize,
            set: (v) => { gridSize = v; }
        });
        Object.defineProperty(window, 'gridState', {
            get: () => gridState,
            set: (v) => { gridState = v; }
        });
        Object.defineProperty(window, 'initialGridStateForShare', {
            get: () => initialGridStateForShare,
            set: (v) => { initialGridStateForShare = v; }
        });
        Object.defineProperty(window, 'targetGridState', {
            get: () => targetGridState,
            set: (v) => { targetGridState = v; }
        });
        Object.defineProperty(window, 'selectedRotatingNode', {
            get: () => selectedRotatingNode,
            set: (v) => { selectedRotatingNode = v; }
        });
        Object.defineProperty(window, 'selectedPivotNode', {
            get: () => selectedPivotNode,
            set: (v) => { selectedPivotNode = v; }
        });
        Object.defineProperty(window, 'potentialPivots', {
            get: () => potentialPivots,
            set: (v) => { potentialPivots = v; }
        });
        Object.defineProperty(window, 'potentialDestinations', {
            get: () => potentialDestinations,
            set: (v) => { potentialDestinations = v; }
        });
        Object.defineProperty(window, 'potentialDoubleDestinations', {
            get: () => potentialDoubleDestinations,
            set: (v) => { potentialDoubleDestinations = v; }
        });
        Object.defineProperty(window, 'moveHistory', {
            get: () => moveHistory,
            set: (v) => { moveHistory = v; }
        });
        window.initializeApp = initializeApp;
        window.SwarmMode = SwarmMode;

        // --- Initial Call ---
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        } 