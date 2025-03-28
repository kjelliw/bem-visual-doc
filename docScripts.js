// Store CSS variables from our stylesheet
const cssVariables = new Map();
// CSS variables will be populated at runtime from the main script

// Helper function to resolve CSS variables in a property value
function resolveVarReferences(value) {
    // Only process strings with "var(" in them
    if (!value || !value.includes('var(')) return value;
    
    return value.replace(/var\(([^)]+)\)/g, (match, varName) => {
        // Handle fallback values inside var()
        const parts = varName.split(',');
        const name = parts[0].trim();
        const fallback = parts.length > 1 ? parts.slice(1).join(',').trim() : '';
        
        if (cssVariables.has(name)) {
            let resolvedValue = cssVariables.get(name);
            
            // Convert rem to px in the tooltip
            if (resolvedValue.includes('rem')) {
                resolvedValue = resolvedValue.replace(/(\d*\.?\d+)rem/g, (match, remValue) => {
                    const pxValue = parseFloat(remValue) * 16;
                    return `${remValue}rem (${pxValue}px)`;
                });
            }
            
            // Check if the resolved value itself contains variables
            if (resolvedValue.includes('var(')) {
                return `var(${name}) /* = ${resolveVarReferences(resolvedValue)} */`;
            }
            return `var(${name}) /* = ${resolvedValue} */`;
        } else if (fallback) {
            return `var(${name}, ${fallback})`;
        }
        return match; // Return original if not found
    });
}

function filterElements() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const matchCountEl = document.getElementById('match-count');
    
    // Filter HTML elements
    const htmlElements = document.querySelectorAll('#html-elements .example-box');
    let htmlMatches = 0;
    
    htmlElements.forEach(el => {
        const elName = el.querySelector('.example-name').textContent.toLowerCase();
        if (searchTerm === '' || elName.includes(searchTerm)) {
            el.classList.remove('hidden');
            htmlMatches++;
        } else {
            el.classList.add('hidden');
        }
    });
    
    // Show/hide HTML elements section based on matches
    const htmlSection = document.getElementById('html-elements');
    if (htmlMatches === 0 && searchTerm !== '') {
        htmlSection.classList.add('hidden');
    } else {
        htmlSection.classList.remove('hidden');
        // Don't automatically open the section - leave it to user control
    }
    
    // Filter BEM blocks
    const bemBlocks = document.querySelectorAll('#bem-section .bem-block');
    let totalBemMatches = 0;
    let visibleBlocks = 0;
    
    bemBlocks.forEach(block => {
        // Get the block name from the summary h3
        const blockSummary = block.querySelector('summary h3');
        if (!blockSummary) return; // Skip if no h3 found
        
        const blockName = blockSummary.textContent.toLowerCase();
        const examples = block.querySelectorAll('.example-box');
        let blockMatches = 0;
        
        examples.forEach(ex => {
            const className = ex.querySelector('.example-name').textContent.toLowerCase();
            if (searchTerm === '' || className.includes(searchTerm) || blockName.includes(searchTerm)) {
                ex.classList.remove('hidden');
                blockMatches++;
            } else {
                ex.classList.add('hidden');
            }
        });
        
        if (blockMatches > 0 || searchTerm === '') {
            block.classList.remove('hidden');
            visibleBlocks++;
            totalBemMatches += blockMatches;
        } else {
            block.classList.add('hidden');
        }
    });
    
    // Always keep CSS Variables section visible, ignoring search
    const cssVarsSection = document.querySelector('.css-variables-section');
    if (cssVarsSection) {
        cssVarsSection.classList.remove('hidden');
        // Don't modify open/close state
    }
    
    // Show/hide BEM section based on matches
    const bemSection = document.getElementById('bem-section');
    if (visibleBlocks === 0 && searchTerm !== '') {
        bemSection.classList.add('hidden');
    } else {
        bemSection.classList.remove('hidden');
    }
    
    // Update match count
    const totalMatches = htmlMatches + totalBemMatches;
    matchCountEl.textContent = searchTerm === '' ? '' : `Found ${totalMatches} matches`;
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    
    // Reset visibility of all elements first
    document.querySelectorAll('.hidden').forEach(el => {
        el.classList.remove('hidden');
    });
    
    // Update match counter
    document.getElementById('match-count').textContent = '';
    
    // Set focus back to the search input
    document.getElementById('search-input').focus();
}

// Initialize search on page load
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', filterElements);
    
    // Add clear button functionality
    document.getElementById('clear-search').addEventListener('click', clearSearch);
    
    // Add keyboard shortcut (Ctrl+F or Cmd+F)
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Clear search on Escape
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            clearSearch();
        }
    });

    // Run a single initialization function for a cleaner startup
    setTimeout(initializeAll, 500);
});

function initializeAll() {
    // Initialize tooltips
    initializeHtmlElementTooltips();
    
    // Enhance tooltips with variable resolution
    enhanceTooltipsWithVarResolution();
    
    // Adjust tooltip positions
    adjustTooltipPositions();
    
    // Add tooltip toggle functionality
    document.querySelectorAll('.tooltip-toggle').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const tooltip = this.nextElementSibling;
            tooltip.style.visibility = tooltip.style.visibility === 'visible' ? 'hidden' : 'visible';
            tooltip.style.opacity = tooltip.style.opacity === '1' ? '0' : '1';
        });
    });
}

// Add tooltip position adjustment
function adjustTooltipPositions() {
    const tooltips = document.querySelectorAll('.tooltip-content');
    
    tooltips.forEach(tooltip => {
        // Reset classes
        tooltip.classList.remove('tooltip-left', 'tooltip-right');
        
        // Get element's position relative to viewport
        const rect = tooltip.getBoundingClientRect();
        const parentRect = tooltip.parentElement.getBoundingClientRect();
        
        // Adjust horizontal position if needed
        if (rect.left < 20) {
            tooltip.classList.add('tooltip-left');
        } else if (rect.right > window.innerWidth - 20) {
            tooltip.classList.add('tooltip-right');
        }
    });
}

// Adjust tooltips on window resize
window.addEventListener('resize', adjustTooltipPositions);

// Fetch and display computed styles for HTML elements
function getComputedStylesForElement(element) {
    const computedStyle = window.getComputedStyle(element);
    const properties = [];
    
    // Common CSS properties to display (can be expanded)
    const cssProperties = [
        // Box model
        'display', 'width', 'height', 'box-sizing', 'margin', 'padding', 'border',
        // Typography
        'font-family', 'font-size', 'font-weight', 'line-height', 'color', 'text-align',
        'text-decoration', 'text-transform',
        // Layout
        'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear',
        // Visual
        'background', 'background-color', 'opacity', 'box-shadow', 'border-radius',
        // Flexbox/Grid
        'flex', 'flex-direction', 'justify-content', 'align-items', 'grid-template-columns',
        // Other
        'overflow', 'white-space', 'cursor', 'transition'
    ];
    
    cssProperties.forEach(prop => {
        const value = computedStyle.getPropertyValue(prop);
        if (value) {
            properties.push(`${prop}: ${value};`);
        }
    });
    
    return properties;
}

// Initialize tooltips for HTML elements
function initializeHtmlElementTooltips() {
    const htmlElementBoxes = document.querySelectorAll('#html-elements .example-box');
    
    htmlElementBoxes.forEach(box => {
        const tagName = box.querySelector('.example-name').textContent;
        const exampleElement = box.querySelector('.example > *');
        
        // Only if the element exists in the DOM
        if (exampleElement) {
            // Create tooltip toggle button
            const tooltipToggle = document.createElement('button');
            tooltipToggle.className = 'tooltip-toggle';
            tooltipToggle.textContent = '?';
            box.appendChild(tooltipToggle);
            
            // Create tooltip content container
            const tooltipContent = document.createElement('div');
            tooltipContent.className = 'tooltip-content';
            
            // Add computed styles to tooltip
            const selector = document.createElement('div');
            selector.className = 'tooltip-selector';
            selector.textContent = tagName;
            tooltipContent.appendChild(selector);
            
            const styles = getComputedStylesForElement(exampleElement);
            styles.forEach(style => {
                const propertyDiv = document.createElement('div');
                propertyDiv.className = 'tooltip-property';
                propertyDiv.textContent = style;
                tooltipContent.appendChild(propertyDiv);
            });
            
            box.appendChild(tooltipContent);
            box.classList.add('tooltip');
        }
    });
    
    // Add click event listeners for the tooltip toggles
    document.querySelectorAll('#html-elements .tooltip-toggle').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const tooltip = this.nextElementSibling;
            tooltip.style.visibility = tooltip.style.visibility === 'visible' ? 'hidden' : 'visible';
            tooltip.style.opacity = tooltip.style.opacity === '1' ? '0' : '1';
        });
    });
}

// Apply variable resolution to tooltips
function enhanceTooltipsWithVarResolution() {
    // For CSS class tooltips (already rendered in HTML)
    document.querySelectorAll('.tooltip-property').forEach(prop => {
        // Skip if already processed (contains span elements)
        if (prop.querySelector('span')) return;
        
        const text = prop.textContent;
        if (text.includes('var(')) {
            const resolvedText = resolveVarReferences(text);
            prop.innerHTML = resolvedText.replace(/\/\* = (.*?) \*\//g, '<span class="var-value">→ $1</span>');
        }
    });
}