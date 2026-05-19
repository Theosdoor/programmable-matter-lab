// Shared drag-and-drop state and utilities for the membrane editor.
// Must be loaded before any page script that uses these functions.
let draggedElementData = null;

function setupDragAndDrop(handle, container) {
    handle.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedElementData = container;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', container.id);
        setTimeout(() => { if (draggedElementData) draggedElementData.style.opacity = '0.5'; }, 0);
    });
    handle.addEventListener('dragend', (e) => {
        e.stopPropagation();
        if (draggedElementData) draggedElementData.style.opacity = '1';
        draggedElementData = null;
        document.querySelectorAll('.drop-target-highlight').forEach(el => el.classList.remove('drop-target-highlight'));
    });
}

// fallbackContainer is used when the drop target cannot be resolved from the
// element hierarchy (e.g. the page's visualEditorArea).
function addDropListeners(target, fallbackContainer) {
    target.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (draggedElementData && target !== draggedElementData && !draggedElementData.contains(target)) {
            target.classList.add('drop-target-highlight');
        }
    });
    target.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        target.classList.remove('drop-target-highlight');
    });
    target.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        target.classList.remove('drop-target-highlight');
        if (draggedElementData && target !== draggedElementData && !draggedElementData.contains(target)) {
            const actualDropTarget = (target.classList.contains('membrane-content') || target.classList.contains('editor-area'))
                ? target
                : target.closest('.membrane-draggable')?.querySelector('.membrane-content') || fallbackContainer;
            if (actualDropTarget) actualDropTarget.appendChild(draggedElementData);
        }
        if (draggedElementData) draggedElementData.style.opacity = '1';
        draggedElementData = null;
    });
}
