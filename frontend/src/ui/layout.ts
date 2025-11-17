/**
 * Initializes the layout manager for sidebar and resizing.
 */
export function initializeLayout() {
    const sidebar = document.getElementById('sidebar')!;
    const resizer = document.getElementById('resizer')!;
    const btnToggle = document.getElementById('btn-toggle-sidebar')!;
    const contentArea = document.getElementById('content-area')!;
    
    // Sidebar toggle
    btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
    
    // Sidebar resizing
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
        
        sidebar.style.width = `${newWidth}px`;
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}