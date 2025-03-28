// ==UserScript==
// @name         Neopets Pound Lookup Links
// @namespace    neopets
// @version      3.1
// @description  Adds lookup links and copy info buttons next to pet names in the Neopets
// @author       Laurore
// @match        https://www.neopets.com/pound/*
// @match        http://www.neopets.com/pound/*
// @grant        GM_setClipboard
// @run-at       document-end
// @update       https://github.com/l0aurore/pound_pet_lookup/blob/main/pound_pet_lookup.user.js
// @download     https://github.com/l0aurore/pound_pet_lookup/blob/main/pound_pet_lookup.user.js
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

    // Class names for custom elements to help with identification
    const LOOKUP_LINK_CLASS = 'userscript-pet-lookup-link';
    const COPY_BUTTON_CLASS = 'userscript-pet-copy-button';

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
        button.setAttribute('title', `Copy ${petName}'s info for !p command`);
        button.classList.add(COPY_BUTTON_CLASS);
        button.dataset.petId = petId;

        button.addEventListener('click', function(e) {
            e.preventDefault();

            // IMPORTANT: Always get the most up-to-date pet information at click time
            // This ensures we always get the current pet info even after AJAX updates
            const petInfo = extractPetInfo(petId);

            // Format: !p name species color gender
            const clipboardText = `!p ${petInfo.name} \n ${petInfo.species} \n ${petInfo.color} \n ${petInfo.gender}`;

            // Copy to clipboard
            try {
                // Use Tampermonkey's GM_setClipboard if available
                if (typeof GM_setClipboard !== 'undefined') {
                    GM_setClipboard(clipboardText);
                    button.textContent = '[copied!]';
                    setTimeout(() => { button.textContent = '[Copy !p]'; }, 2000);
                } else {
                    // Fallback to regular clipboard API
                    navigator.clipboard.writeText(clipboardText).then(() => {
                        button.textContent = '[copied!]';
                        setTimeout(() => { button.textContent = '[Copy !p]'; }, 2000);
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
     * @param {string} petId - The ID of the pet (e.g., "pet0", "pet1")
     * @returns {HTMLElement} - The created link element
     */
    function createLookupLink(petName, petId) {
        const link = document.createElement('a');
        link.href = `https://www.neopets.com/petlookup.phtml?pet=${encodeURIComponent(petName)}`;
        link.textContent = '[lookup]';
        link.setAttribute('style', linkStyle);
        link.setAttribute('target', '_blank');
        link.setAttribute('title', `Open ${petName}'s lookup in a new tab`);
        link.classList.add(LOOKUP_LINK_CLASS);
        link.dataset.petId = petId;
        return link;
    }

    /**
     * Removes existing lookup links and copy buttons associated with a pet ID
     * @param {string} petId - The ID of the pet (e.g., "pet0", "pet1")
     */
    function removeExistingLinks(petId) {
        // Remove lookup links
        document.querySelectorAll(`.${LOOKUP_LINK_CLASS}[data-pet-id="${petId}"]`).forEach(element => {
            element.remove();
        });
        
        // Remove copy buttons
        document.querySelectorAll(`.${COPY_BUTTON_CLASS}[data-pet-id="${petId}"]`).forEach(element => {
            element.remove();
        });
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

        // Extract just the ID part (e.g., "pet0" from "pet0_name")
        const petId = elementId.replace('_name', '');
        
        // Always remove existing links and buttons for this pet
        // This ensures we don't get duplicate links and that links are always updated
        removeExistingLinks(petId);

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

        // Create the lookup link and copy button with the current pet information
        const lookupLink = createLookupLink(petName, petId);
        const copyButton = createCopyButton(petId, petName);

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
     * Process all known pet elements on the page
     */
    function processAllPets() {
        console.log('Processing all pets...');
        
        // Process the standard 4 pets in the pound
        for (let i = 0; i < 4; i++) {
            addLookupLinkToPet(`pet${i}_name`);
        }

        // Additional search for pet names that might follow different patterns
        const potentialPetNameElements = document.querySelectorAll('input[name*="pet_name"], input[name*="petname"], td[id*="pet_name"], span[id*="pet_name"]');
        potentialPetNameElements.forEach(element => {
            if (!element.id) return;
            addLookupLinkToPet(element.id);
        });
    }

    /**
     * Setup MutationObserver to watch for AJAX updates
     */
    function setupMutationObserver() {
        // Define what elements to watch for changes
        const targetNodes = [
            // Main pound container - this might vary based on the site structure
            document.querySelector('#pound-container, #content, .content-area, body') || document.body
        ];

        // Options for the observer (which mutations to observe)
        const config = { 
            childList: true,    // observe direct children
            subtree: true,      // and lower descendants too
            attributes: true,   // observe attribute changes
            characterData: true // observe text content changes
        };

        // Create an observer instance
        const observer = new MutationObserver(function(mutations) {
            // Check if any mutation involves pet elements
            let shouldProcess = false;
            
            mutations.forEach(mutation => {
                // If elements were added/removed
                if (mutation.type === 'childList') {
                    // Check if any of the added nodes contain pet information
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 1) { // Element node
                            if (node.id && (node.id.includes('pet') || node.id.includes('_name'))) {
                                shouldProcess = true;
                                break;
                            }
                            
                            // Check if this node contains pet elements
                            if (node.querySelector && (
                                node.querySelector('[id*="pet"]') || 
                                node.querySelector('[id*="_name"]') ||
                                node.querySelector('[id*="_species"]') ||
                                node.querySelector('[id*="_color"]')
                            )) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
                // If attributes changed and it's a pet-related element
                else if (mutation.type === 'attributes' || mutation.type === 'characterData') {
                    const node = mutation.target;
                    if (node.id && (
                        node.id.includes('pet') || 
                        node.id.includes('_name') ||
                        node.id.includes('_species') ||
                        node.id.includes('_color')
                    )) {
                        shouldProcess = true;
                    }
                }
            });
            
            // If we detected relevant changes, update our links
            if (shouldProcess) {
                // Add a slight delay to ensure DOM is fully updated
                setTimeout(processAllPets, 100);
            }
        });

        // Start observing each target node
        targetNodes.forEach(target => {
            if (target) {
                observer.observe(target, config);
            }
        });

        // Return the observer so it can be disconnected if needed
        return observer;
    }

    /**
     * Main initialization function
     */
    function init() {
        console.log('Neopets Pound Lookup Links script initializing...');
        
        // Process all pets initially
        processAllPets();
        
        // Set up mutation observer to handle AJAX updates
        const observer = setupMutationObserver();
        
        // Set up global refresh interval as a fallback mechanism
        // This helps catch updates that might not trigger the mutation observer
        setInterval(processAllPets, 5000);
    }

    // Initialize the script
    init();
})();
