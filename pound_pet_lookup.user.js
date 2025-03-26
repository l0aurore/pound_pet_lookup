// ==UserScript==
// @name         Neopets Pound Lookup Links
// @namespace    neopets
// @version      2.0
// @description  Adds lookup links and copy info buttons next to pet names in the Neopets pound
// @author       You
// @match        https://www.neopets.com/pound/*
// @match        http://www.neopets.com/pound/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const linkStyle = `
        color: #5a73ae;
        margin-left: 5px;
        font-size: 0.9em;
        text-decoration: underline;
        cursor: pointer;
        font-weight: bold;
    `;

    const copyButtonStyle = `
        color: #57a957;
        margin-left: 5px;
        font-size: 0.9em;
        text-decoration: underline;
        cursor: pointer;
        font-weight: bold;
    `;

    /**
     * Extracts pet information from the page
     * @param {string} petId - The ID of the pet (e.g., "pet0", "pet1")
     * @returns {Object} - The pet information object
     */
    function extractPetInfo(petId) {
        const petInfo = {
            name: '',
            species: '',
            color: '',
            gender: ''
        };

        // Get the pet name
        const nameElement = document.getElementById(`${petId}_name`);
        if (nameElement) {
            petInfo.name = nameElement.tagName === 'INPUT' ? nameElement.value : nameElement.textContent.trim();
        }

        // Direct lookup of pet attributes - most accurate method for Neopets pound page
        // The pound page has specific IDs for these attributes: petX_species, petX_color, petX_gender
        const speciesElement = document.getElementById(`${petId}_species`);
        if (speciesElement) {
            petInfo.species = speciesElement.textContent.trim();
        }

        const colorElement = document.getElementById(`${petId}_color`);
        if (colorElement) {
            petInfo.color = colorElement.textContent.trim();
        }

        const genderElement = document.getElementById(`${petId}_gender`);
        if (genderElement) {
            petInfo.gender = genderElement.textContent.trim();
        }

        // Fallback methods if direct IDs aren't found
        if (!petInfo.species || !petInfo.color || !petInfo.gender) {
            // Try to find associated pet attributes by looking at nearby elements
            if (nameElement) {
                // Method 1: Look for spans or divs with pet details nearby
                const petContainer = nameElement.closest('div[id^="pet"]');
                if (petContainer) {
                    // Try to find a table with pet stats
                    const statsTable = petContainer.querySelector(`table[id="${petId}_table"]`) ||
                                       petContainer.querySelector('table');

                    if (statsTable) {
                        const rows = statsTable.querySelectorAll('tr');
                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 2) {
                                const label = cells[0].textContent.trim().toLowerCase();
                                const value = cells[1].textContent.trim();

                                if (label.includes('species')) {
                                    petInfo.species = value;
                                } else if (label.includes('colour') || label.includes('color')) {
                                    petInfo.color = value;
                                } else if (label.includes('gender')) {
                                    petInfo.gender = value;
                                }
                            }
                        });
                    } else {
                        // If no table, look for specific elements
                        const allElements = petContainer.querySelectorAll('*');
                        allElements.forEach(element => {
                            const text = element.textContent.trim();
                            if (text.includes('Species:')) {
                                petInfo.species = text.replace('Species:', '').trim();
                            }
                            if (text.includes('Colour:') || text.includes('Color:')) {
                                petInfo.color = text.replace(/Colou?r:/, '').trim();
                            }
                            if (text.includes('Gender:')) {
                                petInfo.gender = text.replace('Gender:', '').trim();
                            }
                        });
                    }
                }

                // Method 2: Check for species and color in the same row
                const row = nameElement.closest('tr');
                if (row) {
                    const cells = row.querySelectorAll('td');
                    cells.forEach(cell => {
                        const text = cell.textContent.trim();
                        if (text.includes('Species:')) {
                            petInfo.species = text.replace('Species:', '').trim();
                        }
                        if (text.includes('Colour:') || text.includes('Color:')) {
                            petInfo.color = text.replace(/Colou?r:/, '').trim();
                        }
                        if (text.includes('Gender:') || text.match(/\b(male|female)\b/i)) {
                            petInfo.gender = text.includes('male') ? 'male' : 'female';
                        }
                    });
                }

                // Method 3: Look in nearby "pet details" container
                const petDetailsContainer = nameElement.closest('.pet-row, .pet-details, .petdetails, .pet-container');
                if (petDetailsContainer) {
                    const detailsText = petDetailsContainer.textContent;

                    // Extract species
                    const speciesMatch = detailsText.match(/Species:\s*([a-zA-Z]+)/);
                    if (speciesMatch && speciesMatch[1]) {
                        petInfo.species = speciesMatch[1].trim();
                    }

                    // Extract color
                    const colorMatch = detailsText.match(/Colou?r:\s*([a-zA-Z]+)/);
                    if (colorMatch && colorMatch[1]) {
                        petInfo.color = colorMatch[1].trim();
                    }

                    // Extract gender
                    if (detailsText.match(/\b(male)\b/i)) {
                        petInfo.gender = 'male';
                    } else if (detailsText.match(/\b(female)\b/i)) {
                        petInfo.gender = 'female';
                    }
                }
            }
        }

        // For test page compatibility - directly extract from data attributes if available
        if (nameElement && nameElement.dataset) {
            if (nameElement.dataset.species) petInfo.species = nameElement.dataset.species;
            if (nameElement.dataset.color) petInfo.color = nameElement.dataset.color;
            if (nameElement.dataset.gender) petInfo.gender = nameElement.dataset.gender;
        }

        return petInfo;
    }

    /**
     * Creates a copy button for pet information
     * @param {string} petId - The ID of the pet (e.g., "pet0", "pet1")
     * @param {string} petName - The name of the pet
     * @returns {HTMLElement} - The created button element
     */
    function createCopyButton(petId, petName) {
        const button = document.createElement('a');
        button.textContent = '[Copy !p]';
        button.setAttribute('style', copyButtonStyle);
        button.setAttribute('href', 'javascript:void(0);');
        button.setAttribute('title', `Copy ${petName}'s for !p command`);

        button.addEventListener('click', function(e) {
            e.preventDefault();

            // Extract pet number from ID (pet0 -> 0, pet1 -> 1, etc.)
            const petNumber = petId.replace('pet', '');

            // Get pet information
            const petInfo = extractPetInfo(petId);

            // Format: !p s_name s_species s_color s_gender
            // where s is the pet number (0, 1, 2, 3)
            const clipboardText = `!p ${petInfo.name} \n ${petInfo.species} \n ${petInfo.color} \n ${petInfo.gender}`;

            // Copy to clipboard
            try {
                // Use Tampermonkey's GM_setClipboard if available
                if (typeof GM_setClipboard !== 'undefined') {
                    GM_setClipboard(clipboardText);
                    button.textContent = '[copied!]';
                    setTimeout(() => { button.textContent = '[copy info]'; }, 2000);
                } else {
                    // Fallback to regular clipboard API
                    navigator.clipboard.writeText(clipboardText).then(() => {
                        button.textContent = '[copied!]';
                        setTimeout(() => { button.textContent = '[copy info]'; }, 2000);
                    });
                }
                console.log(`Copied to clipboard: ${clipboardText}`);
            } catch (err) {
                console.error('Failed to copy pet info: ', err);
                alert(`Failed to copy. Text to copy: ${clipboardText}`);
            }
        });

        return button;
    }

    /**
     * Creates a lookup link for a pet name
     * @param {string} petName - The name of the pet
     * @returns {HTMLElement} - The created link element
     */
    function createLookupLink(petName) {
        const link = document.createElement('a');
        link.href = `https://www.neopets.com/petlookup.phtml?pet=${encodeURIComponent(petName)}`;
        link.textContent = '[lookup]';
        link.setAttribute('style', linkStyle);
        link.setAttribute('target', '_blank');
        link.setAttribute('title', `Open ${petName}'s lookup in a new tab`);
        return link;
    }

    /**
     * Adds a lookup link and copy button next to a pet name element
     * @param {string} elementId - The ID of the pet name element
     */
    function addLookupLinkToPet(elementId) {
        const petNameElement = document.getElementById(elementId);
        if (!petNameElement) {
            console.log(`Pet element ${elementId} not found`);
            return;
        }

        // Check if this element already has a lookup link
        if (petNameElement.nextSibling &&
            petNameElement.nextSibling.tagName === 'A' &&
            petNameElement.nextSibling.textContent === '[lookup]') {
            console.log(`Pet element ${elementId} already has a lookup link`);
            return;
        }

        // Get the pet name, handle both text nodes and input fields
        let petName;
        if (petNameElement.tagName === 'INPUT') {
            petName = petNameElement.value;
        } else {
            petName = petNameElement.textContent.trim();
        }

        if (!petName) {
            console.log(`No pet name found in ${elementId}`);
            return;
        }

        // Create the lookup link and copy button
        const lookupLink = createLookupLink(petName);
        const copyButton = createCopyButton(elementId.replace('_name', ''), petName);

        // Extract just the ID part (e.g., "pet0" from "pet0_name")
        const petId = elementId.replace('_name', '');

        // Add both elements to the DOM
        if (petNameElement.nextSibling) {
            // Insert in reverse order so they appear in the correct order
            petNameElement.parentNode.insertBefore(copyButton, petNameElement.nextSibling);
            petNameElement.parentNode.insertBefore(lookupLink, petNameElement.nextSibling);
        } else {
            petNameElement.parentNode.appendChild(lookupLink);
            petNameElement.parentNode.appendChild(copyButton);
        }
    }

    /**
     * Main function to process the page
     */
    function processPage() {
        console.log('Neopets Pound Lookup Links script running...');

        // This will add links for all pet name elements pet0_name through pet3_name
        addLookupLinkToPet('pet0_name');
        addLookupLinkToPet('pet1_name');
        addLookupLinkToPet('pet2_name');
        addLookupLinkToPet('pet3_name');

        // Additional search for pet names that might follow different patterns
        // This is a backup approach to find pet elements
        const potentialPetNameElements = document.querySelectorAll('input[name*="pet_name"], input[name*="petname"], td[id*="pet_name"], span[id*="pet_name"]');
        potentialPetNameElements.forEach(element => {
            if (!element.id) return;
            if (!element.id.includes('pet') || !element.id.includes('name')) return;
            // Skip elements we've already processed in the first section
            if (['pet0_name', 'pet1_name', 'pet2_name', 'pet3_name'].includes(element.id)) return;

            // Skip elements that already have a lookup link
            if (element.nextSibling && element.nextSibling.textContent === '[lookup]') return;

            // Add link to other pet name elements found
            let petName;
            if (element.tagName === 'INPUT') {
                petName = element.value;
            } else {
                petName = element.textContent.trim();
            }

            if (!petName) return;

            // Try to extract the pet ID from the element ID (pet4_name -> pet4)
            let petId = 'unknown';
            if (element.id && element.id.includes('pet') && element.id.includes('name')) {
                petId = element.id.replace('_name', '');
            }

            const lookupLink = createLookupLink(petName);
            const copyButton = createCopyButton(petId, petName);

            if (element.nextSibling) {
                element.parentNode.insertBefore(copyButton, element.nextSibling);
                element.parentNode.insertBefore(lookupLink, element.nextSibling);
            } else {
                element.parentNode.appendChild(lookupLink);
                element.parentNode.appendChild(copyButton);
            }
        });

        // Look for pet name texts that might be in table cells
        // This handles cases where pet names don't have specific IDs
        const tableCells = document.querySelectorAll('td');
        tableCells.forEach(cell => {
            const cellText = cell.textContent.trim();
            // Skip cells with no text or very long text (likely not a pet name)
            if (!cellText || cellText.length > 20 || cellText.includes(':')) return;

            // Skip if cell already contains a lookup link
            if (cell.innerHTML.includes('[lookup]')) return;

            // Look for cells that might contain pet names based on context
            const rowCells = cell.parentElement.cells;
            if (rowCells && rowCells.length > 1) {
                // Check if the next cell contains attributes like "Level", "Species", etc.
                const nextCell = cell.nextElementSibling;
                if (nextCell &&
                    (nextCell.textContent.includes('Level') ||
                     nextCell.textContent.includes('Species') ||
                     nextCell.textContent.includes('Colour'))) {

                    // Create a generic pet ID since we don't have a specific identifier
                    // Try to guess which pet this is based on row index or position
                    let petId = 'unknown';
                    if (cell.parentElement && cell.parentElement.rowIndex !== undefined) {
                        petId = `pet${cell.parentElement.rowIndex}`;
                    }

                    const lookupLink = createLookupLink(cellText);
                    const copyButton = createCopyButton(petId, cellText);

                    cell.appendChild(document.createTextNode(' '));
                    cell.appendChild(lookupLink);
                    cell.appendChild(document.createTextNode(' '));
                    cell.appendChild(copyButton);
                }
            }
        });
    }

    // Run the script
    // Use a short delay to ensure all elements are loaded
    setTimeout(processPage, 500);

    // Set up a MutationObserver to detect when new content is added to the page
    // This is more reliable than the XMLHttpRequest approach for detecting dynamic changes
    const observer = new MutationObserver(function(mutations) {
        let shouldProcess = false;

        // Check if any meaningful changes occurred that might contain pet elements
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    // Only process if actual elements were added (not text nodes)
                    if (node.nodeType === 1) {
                        shouldProcess = true;
                        break;
                    }
                }
            }
        });

        if (shouldProcess) {
            console.log('Detected DOM changes, reprocessing page...');
            setTimeout(processPage, 300);
        }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
})();
