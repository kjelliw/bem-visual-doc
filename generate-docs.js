const fs = require('fs-extra');
const postcss = require('postcss');
const safeParser = require('postcss-safe-parser');
const path = require('path');

// Get CSS_FILE from command line arguments or use default
const CSS_FILE = process.argv[2];
const OUTPUT_FILE = process.argv[3] || path.join('docs', 'index.html');

const allHtmlElements = [
    "article", "section", "nav", "aside", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "footer", "address", "p", "hr", "pre", "blockquote", "ol", "ul", "li",
    "dl", "dt", "dd", "figure", "figcaption", "main", "div", "a", "em", "strong",
    "small", "s", "cite", "q", "dfn", "abbr", "ruby", "rt", "rp", "code", "var",
    "samp", "kbd", "sub", "sup", "i", "b", "u", "mark", "bdi", "bdo", "span",
    "ins", "del", "img", "iframe", "embed", "object", "param", "video", "audio",
    "source", "track", "canvas", "map", "area", "table", "caption", "colgroup",
    "col", "tbody", "thead", "tfoot", "tr", "td", "th", "form", "label", "input",
    "button", "select", "optgroup", "option", "textarea", "output", "progress",
    "meter", "fieldset", "legend", "datalist", "template",
    "slot", "shadow", "dialog", "details", "summary", "menu", "menuitem", "command",
    "time", "mark", "wbr", "bgsound", "marquee"
];

// Extract and group classes by BEM structure
async function extractBEMClasses() {
    try {
        // Log which CSS file we're processing
        console.log(`Processing CSS file: ${CSS_FILE}`);
        
        const css = await fs.readFile(CSS_FILE, 'utf8');
        const root = postcss.parse(css, { parser: safeParser });

        const bemGroups = new Map(); // Stores BEM groups (blocks -> elements/modifiers)
        const cssRules = new Map(); // Stores CSS rules for each class
        const cssVars = new Map(); // Stores CSS variables and their values

        // Extract CSS variables
        root.walkRules(rule => {
            if (rule.selector === ':root' || rule.selector.includes('body')) {
                rule.walkDecls(decl => {
                    if (decl.prop.startsWith('--')) {
                        cssVars.set(decl.prop, decl.value);
                    }
                });
            }
        });

        root.walkRules(rule => {
            rule.selectors.forEach(selector => {
                const matches = selector.match(/\.[a-zA-Z0-9_-]+/g);
                if (matches) {
                    matches.forEach(cls => {
                        const className = cls.replace('.', '');
                        
                        // Store the CSS properties for this class
                        if (!cssRules.has(className)) {
                            cssRules.set(className, []);
                        }
                        
                        // Extract properties and values
                        const properties = [];
                        rule.walkDecls(decl => {
                            properties.push(`${decl.prop}: ${decl.value};`);
                        });
                        
                        cssRules.get(className).push({
                            selector: selector,
                            properties: properties
                        });

                        // Detect BEM naming convention
                        if (className.includes('__')) {
                            // This is an element
                            const parts = className.split('__');
                            const block = parts[0];
                            const elementParts = parts[1].split('--');
                            const element = elementParts[0];
                            const modifier = elementParts.length > 1 ? elementParts[1] : null;
                            
                            if (!bemGroups.has(block)) {
                                bemGroups.set(block, { elements: new Set(), modifiers: new Set(), base: new Set() });
                            }
                            
                            bemGroups.get(block).elements.add(className);
                            
                            // If there's also a modifier on this element
                            if (modifier) {
                                bemGroups.get(block).modifiers.add(`${block}__${element}--${modifier}`);
                            }
                        } else if (className.includes('--')) {
                            // This is a modifier
                            const parts = className.split('--');
                            const block = parts[0];
                            
                            if (!bemGroups.has(block)) {
                                bemGroups.set(block, { elements: new Set(), modifiers: new Set(), base: new Set() });
                            }
                            
                            bemGroups.get(block).modifiers.add(className);
                        } else {
                            // This is a base block
                            const block = className;
                            
                            if (!bemGroups.has(block)) {
                                bemGroups.set(block, { elements: new Set(), modifiers: new Set(), base: new Set() });
                            }
                            
                            bemGroups.get(block).base.add(className);
                        }
                    });
                }
            });
        });

        return { bemGroups, cssRules, cssVars };
    } catch (error) {
        console.error('Error reading CSS file:', error);
        return { bemGroups: new Map(), cssRules: new Map(), cssVars: new Map() };
    }
}

// Generate the HTML file with grouped BEM classes
async function generateDocs() {
    if (!CSS_FILE) {
        throw new Error('Please provide a CSS file as an argument.');
    }

    const { bemGroups, cssRules, cssVars } = await extractBEMClasses();

    if (bemGroups.size === 0) {
        console.log('No classes found in the CSS file.');
        return;
    }

    // Read docStyles.css and docScripts.js from files
    let docStyles = '';
    let searchFilterScript = '';

    try {
        docStyles = await fs.readFile(path.join(__dirname, 'docStyles.css'), 'utf8');
        console.log('Loaded styles from docStyles.css');
    } catch (error) {
        console.error('Error reading docStyles.css:', error);
        docStyles = ''; // Use empty string as fallback
    }

    try {
        searchFilterScript = await fs.readFile(path.join(__dirname, 'docScripts.js'), 'utf8');
        console.log('Loaded scripts from docScripts.js');
    } catch (error) {
        console.error('Error reading docScripts.js:', error);
        searchFilterScript = ''; // Use empty string as fallback
    }

    // Function to render CSS rules tooltip with variable resolution - without duplicate processing
    const renderCssTooltip = (className) => {
        if (!cssRules.has(className)) {
            return '';
        }
        
        const rules = cssRules.get(className);
        const tooltipContent = rules.map(rule => {
            // Don't pre-process variables here, let the JavaScript handle it
            return `<div class="tooltip-selector">${rule.selector}</div>` +
                   rule.properties.map(prop => `<div class="tooltip-property">${prop}</div>`).join('\n');
        }).join('\n\n');
        
        return `
            <button class="tooltip-toggle">?</button>
            <div class="tooltip-content">
                ${tooltipContent}
            </div>
        `;
    };

    // Function to render the standard HTML elements section
    const renderHtmlElements = () => {
        return `
        <details id="html-elements" class="bem-block">
            <summary><h2>Standard HTML Elements</h2></summary>
            <div class="bem-content">
                <div class="elements-container">
                    ${allHtmlElements.map(tag => `
                        <div class="example-box">
                            <div class="example-name">${tag}</div>
                            <div class="example">
                                <${tag}>${tag}</${tag}>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </details>`;
    };

    // Function to render a BEM block with its elements and modifiers
    const renderBemBlock = (block) => {
        const blockData = bemGroups.get(block);
        
        // Render base classes
        const baseClasses = [...blockData.base].map(cls => `
            <div class="example-box tooltip">
                <div class="example-name">.${cls}</div>
                <div class="example">
                    <div class="${cls}">Element content</div>
                </div>
                ${renderCssTooltip(cls)}
            </div>
        `).join('');
        
        // Render element classes if they exist
        const elementClasses = blockData.elements.size > 0 ? `
            <details class="bem-elements">
                <summary><h4 style="display: inline;">Elements (${blockData.elements.size})</h4></summary>
                <div>
                    ${[...blockData.elements].map(cls => `
                        <div class="example-box tooltip">
                            <div class="example-name">.${cls}</div>
                            <div class="example">
                                <div class="${cls}">Element content</div>
                            </div>
                            ${renderCssTooltip(cls)}
                        </div>
                    `).join('')}
                </div>
            </details>
        ` : '';
        
        // Render modifier classes if they exist
        const modifierClasses = blockData.modifiers.size > 0 ? `
            <details class="bem-modifiers">
                <summary><h4 style="display: inline;">Modifiers (${blockData.modifiers.size})</h4></summary>
                <div>
                    ${[...blockData.modifiers].map(cls => `
                        <div class="example-box tooltip">
                            <div class="example-name">.${cls}</div>
                            <div class="example">
                                <div class="${cls}">Element content</div>
                            </div>
                            ${renderCssTooltip(cls)}
                        </div>
                    `).join('')}
                </div>
            </details>
        ` : '';
        
        return `
            <details class="bem-block">
                <summary><h3>${block} (Block)</h3></summary>
                
                <div class="bem-content">
                    <div class="bem-base">
                        ${baseClasses}
                    </div>
                    ${elementClasses}
                    ${modifierClasses}
                </div>
            </details>
        `;
    };

    // Function to convert rem to px (assuming default 16px base)
    const convertRemToPx = (value) => {
        if (!value || typeof value !== 'string') return value;
        
        return value.replace(/(\d*\.?\d+)rem/g, (match, remValue) => {
            const pxValue = parseFloat(remValue) * 16;
            return `${remValue}rem (${pxValue}px)`;
        });
    };
    
    // Function to render CSS variables section
    const renderCssVariables = () => {
        if (cssVars.size === 0) {
            return '';
        }
        
        // Group variables by category (assuming a naming convention)
        const varsByCategory = new Map();
        const uncategorized = [];
        
        cssVars.forEach((value, name) => {
            // Extract category from variable name (assuming naming like --category-name)
            const parts = name.split('-');
            if (parts.length >= 3) {
                const category = parts[1]; // Use second part as category (after --)
                if (!varsByCategory.has(category)) {
                    varsByCategory.set(category, []);
                }
                varsByCategory.get(category).push({ name, value });
            } else {
                uncategorized.push({ name, value });
            }
        });

        // Generate the HTML content for variables
        let content = '<div class="css-vars-grid">';
        
        // Add categorized variables
        varsByCategory.forEach((vars, category) => {
            content += `
                <div class="var-category">
                    <h4>${category}</h4>
                    <div class="var-list">
                        ${vars.map(v => `
                            <div class="var-item">
                                <div class="var-name">${v.name}</div>
                                <div class="var-value">${convertRemToPx(v.value)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        // Add uncategorized variables if any
        if (uncategorized.length > 0) {
            content += `
                <div class="var-category">
                    <h4>Other</h4>
                    <div class="var-list">
                        ${uncategorized.map(v => `
                            <div class="var-item">
                                <div class="var-name">${v.name}</div>
                                <div class="var-value">${convertRemToPx(v.value)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        content += '</div>';
        
        return `
            <details class="css-variables-section bem-block">
                <summary><h2>CSS Variables (${cssVars.size})</h2></summary>
                <div class="bem-content">
                    ${content}
                </div>
            </details>
        `;
    };

    // Function to render BEM section
    const renderBemSection = () => {
        return `
        <div id="bem-section">
            <h2>BEM Classes</h2>
            <div class="bem-blocks-container">
                ${[...bemGroups.keys()].map(block => renderBemBlock(block)).join('')}
            </div>
        </div>`;
    };

    // Generate statistics HTML
    const statistics = `
        <div class="stats">
            <div class="stat-item">
                <p>Total Blocks: ${bemGroups.size}</p>
            </div>
            <div class="stat-item">
                <p>Total Elements: ${[...bemGroups.values()].reduce((sum, group) => sum + group.elements.size, 0)}</p>
            </div>
            <div class="stat-item">
                <p>Total Modifiers: ${[...bemGroups.values()].reduce((sum, group) => sum + group.modifiers.size, 0)}</p>
            </div>
            <div class="stat-item">
                <p>Total Base Classes: ${[...bemGroups.values()].reduce((sum, group) => sum + group.base.size, 0)}</p>
            </div>
        </div>
    `;

    // Compose the final HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CSS Documentation</title>
        <link rel="stylesheet" href="../${CSS_FILE}">
        <style>
            ${docStyles}
        </style>
    </head>
    <body>
        <h1>CSS Documentation</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>

        <div class="search-container">
            <span class="search-icon">🔍</span>
            <input type="text" id="search-input" placeholder="Search for classes or elements..." autocomplete="off">
            <button id="clear-search" class="clear-search">Clear</button>
            <span id="match-count" class="match-count"></span>
        </div>

        <h2>Statistics</h2>
        ${statistics}
        
        ${renderCssVariables()}

        ${renderHtmlElements()}

        ${renderBemSection()}
        
        <script>
            // Populate CSS variables from the CSS file
            ${Array.from(cssVars.entries()).map(([name, value]) => 
                `cssVariables.set('${name}', '${value.replace(/'/g, "\\'")}');`
            ).join('\n')}
            
            ${searchFilterScript}
        </script>
    </body>
    </html>`;

    await fs.outputFile(OUTPUT_FILE, htmlContent);
    console.log(`Documentation generated: ${OUTPUT_FILE}`);
}

generateDocs();
