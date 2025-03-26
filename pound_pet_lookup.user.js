// ==UserScript==
// @name         Neopets Pound Lookup Links
// @namespace    neopets
// @author       Laurore
// @version      1.0
// @description  Adds lookup links next to pet names in the Neopets pound
// @match        https://www.neopets.com/pound/*
// @match        http://www.neopets.com/pound/*
// @grant        none
// @run-at       document-end
// @downloadURL  https://github.com/l0aurore/pound_pet_lookup/blob/main/pound_pet_lookup.user.js
// @updateURL   https://github.com/l0aurore/pound_pet_lookup/blob/main/pound_pet_lookup.user.js
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
     * Adds a lookup link next to a pet name element
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

        // Create and add the lookup link
        const lookupLink = createLookupLink(petName);
        if (petNameElement.nextSibling) {
            petNameElement.parentNode.insertBefore(lookupLink, petNameElement.nextSibling);
        } else {
            petNameElement.parentNode.appendChild(lookupLink);
        }
    }

    /**
     * Main function to process the page
     */
    function processPage() {
        console.log('Neopets Pound Lookup Links script running...');

        // This will add links for all pet name elements pet0_name through pet2_name
        addLookupLinkToPet('pet0_name');
        addLookupLinkToPet('pet1_name');
        addLookupLinkToPet('pet2_name');


        // Additional search for pet names that might follow different patterns
        // This is a backup approach to find pet elements
        const potentialPetNameElements = document.querySelectorAll('input[name*="pet_name"], input[name*="petname"], td[id*="pet_name"], span[id*="pet_name"]');
        potentialPetNameElements.forEach(element => {
            if (!element.id) return;
            if (!element.id.includes('pet') || !element.id.includes('name')) return;
            // Skip elements we've already processed in the first section
            if (['pet0_name', 'pet1_name', 'pet2_name'].includes(element.id)) return;

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

            const lookupLink = createLookupLink(petName);
            if (element.nextSibling) {
                element.parentNode.insertBefore(lookupLink, element.nextSibling);
            } else {
                element.parentNode.appendChild(lookupLink);
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

                    const lookupLink = createLookupLink(cellText);
                    cell.appendChild(document.createTextNode(' '));
                    cell.appendChild(lookupLink);
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
