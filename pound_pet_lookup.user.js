// ==UserScript==
// @name         Quick pound !p and age Converter
// @namespace    neopets
// @version      5.0
// @description  Adds lookup links and bot copy info buttons next to pet names in the Neopets
// @author       Laurore
// @match        *://www.neopets.com/pound/*
// @match        *://www.neopets.com/userlookup.phtml?user=*
// @match        *://www.neopets.com/petlookup.phtml?pet=*
// @match        *://www.neopets.com/petlookup.phtml
// @match        *://www.neopets.com/quickref.phtml
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
    const COPY_BUTTON_Google_CLASS = 'userscript-google-sheet-copy-button';

    function convertPetAge({ petAgeDays = null, petAgeHours = null }) {
        let yearsOld;

        if (petAgeDays !== null) {
            yearsOld = petAgeDays / 365;
        } else if (petAgeHours !== null) {
            yearsOld = petAgeHours / (24 * 365); // Convert hours → years
        } else {
            yearsOld = 0; // Fallback if neither is available
        }

        const currentYear = new Date().getFullYear(); // e.g., 2025
        const currentNeopianYear = (currentYear + 2) - 2000; // e.g., (2025 + 2) - 2000 = 27
        const neopianYear = currentNeopianYear - yearsOld;

        return {
            days: petAgeDays,
            hours: ~~petAgeHours,
            yearsOld: ~~yearsOld,
            neopianYear: Math.trunc(neopianYear) * 1
        };
    }

   /**
     * Sets up an observer to handle pet lookup pages, particularly for redirects
     * This is crucial for both owned and non-owned pets where page content may change
     */
   function observePetLookupChanges() {
        console.log("Setting up pet lookup observer");

        // Initial run to handle the current page
        setTimeout(handlePetLookupPage, 100);

        // Setup observer for page changes after redirects/ajax loads
        const observer = new MutationObserver((mutations) => {
            // Check if we already have buttons to avoid duplicates
            if (!document.querySelector('.' + COPY_BUTTON_CLASS)) {
                console.log("Content changed, checking for pet lookup elements");
                // Add a delay to ensure the page is fully loaded
                setTimeout(handlePetLookupPage, 300);
            }
        });

        // Observe the document with comprehensive options
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });

        // Multiple fallbacks to handle different page load scenarios
        setTimeout(() => {
            if (!document.querySelector('.' + COPY_BUTTON_CLASS)) {
                console.log("First fallback for pet lookup");
                handlePetLookupPage();
            }
        }, 1000);

        setTimeout(() => {
            if (!document.querySelector('.' + COPY_BUTTON_CLASS)) {
                console.log("Final fallback for pet lookup");
                handlePetLookupPage();
            }
        }, 2500);
    }

    // Initial URL check and route handling
    const url = window.location.href;

    if (url.includes("pound")) {
        extractPetInfo();
    } else if (url.includes("userlookup.phtml")) {
        handleUserLookupPage();
    } else if (url.includes("petlookup")) {
        observePetLookupChanges();
    } else if (url.includes("quickref.phtml")) {
        extractPetInfo();
    }

    function handleUserLookupPage() {
    const petList = document.querySelectorAll('#bxlist > li');


    petList.forEach(pet => {

        const petHTML = pet.innerHTML;

        // Extract Pet Name
        const nameMatch = petHTML.match(/<b>([^<]+)<\/b><br>/);
        const petName = nameMatch ? nameMatch[1].trim() : null;

        // Extract Pet age hours
        const ageHourMatch = petHTML.match(/<b>Age:<\/b>\s*([\d,]+) hours/);
        const petAgeHours = ageHourMatch ? parseInt(ageHourMatch[1].replace(/,/g, '')) : null;

        // Extract Pet age days
        const ageMatch = petHTML.match(/<b>Age:<\/b>\s*([\d,]+) days/);
        const petAgeDays = ageMatch ? parseInt(ageMatch[1].replace(/,/g, '')) : null;

        // Extract Pet level
        const levelMatch = petHTML.match(/<b>Level:<\/b>\s*([\d,]+)/);
        const petLevel = levelMatch ? parseInt(levelMatch[1]) :null;

        // Convert age
        const { yearsOld, neopianYear } = convertPetAge({
            petAgeDays,
            petAgeHours
        });

        // Only proceed if we have name and age data
        if (petName && (petAgeDays !== null || petAgeHours !== null)) {
            console.log(`Processing pet: ${petName}`);

            // Create the copy button
            const copyButton = document.createElement("div");
            copyButton.className = COPY_BUTTON_CLASS;
            copyButton.style.textAlign = "center";
            copyButton.style.margin = "4px 0";
            copyButton.style.padding = "0px";
            copyButton.style.backgroundColor = "#f0f0f0";
            copyButton.style.border = "1px solid #ccc";
            copyButton.style.borderRadius = "0px";
            copyButton.style.cursor = "pointer";

            const copyText = document.createElement("span");
            copyText.textContent = "!p Copy";
            copyText.style.color = "#57a957";
            copyText.style.fontWeight = "bold";
            copyText.title = `Copy info for ${petName}`;

            copyButton.appendChild(copyText);

            // Add click handler
            copyButton.addEventListener("click", () => {
                let text = `!p ${petName} **Y${neopianYear}**`;

                if (petLevel) {
                    text += `\nLevel: ${petLevel}`;
                }

                navigator.clipboard.writeText(text).then(() => {
                    copyText.textContent = "Copied!";
                    setTimeout(() => {
                        copyText.textContent = "!p Copy";
                    }, 1500);
                }).catch(err => {
                    console.error("Failed to copy:", err);
                    copyText.textContent = "Error!";
                    setTimeout(() => {
                        copyText.textContent = "!p Copy";
                    }, 1500);
                });
            });

            // Find the best location to insert the button
                // 1. Try to find the pet image container
                const petImage = pet.querySelector("img");
                if (petImage) {
                    // Insert after the image, which is typically right before the name
                    const imageParent = petImage.parentNode;

                    // If the image is in a center tag or another container
                    if (imageParent.tagName === "CENTER" || imageParent.tagName === "DIV") {
                        imageParent.appendChild(copyButton);
                    } else {
                        // If the image isn't in a container, insert after the image
                        if (petImage.nextSibling) {
                            petImage.parentNode.insertBefore(copyButton, petImage.nextSibling);
                        } else {
                            petImage.parentNode.appendChild(copyButton);
                        }
                    }
                }
                // Fallback: if we can't find the image, insert at beginning of the li
                else if (pet.firstChild) {
                    pet.insertBefore(copyButton, pet.firstChild);
                }

                // Also update age display with Neopian years
                const centerElement = pet.querySelector("center");
                if (centerElement) {
                    const ageLabel = Array.from(
                        centerElement.querySelectorAll("b"),
                    ).find((b) => b.textContent.trim() === "Age:");

                    if (
                        ageLabel &&
                        ageLabel.nextSibling &&
                        ageLabel.nextSibling.nodeType === Node.TEXT_NODE
                    ) {
                        let ageDisplay = "";

                        if (petAgeDays !== null) {
                            ageDisplay = `${petAgeDays} d || Y${neopianYear}`;
                        } else if (petAgeHours !== null) {
                            ageDisplay = `${petAgeHours} h || Y${neopianYear}`;
                        } else {
                            ageDisplay = `unknown || Y${neopianYear}`;
                        }

                        ageLabel.nextSibling.textContent = ` ${ageDisplay}`;
                    }
                }
            }
        });

}

    /**
     * Handles the pet lookup page by extracting pet information and adding copy button functionality
     */
    function handlePetLookupPage() {
        console.log("Pet lookup page handler started");

        // Check if we've already processed this page to avoid duplicate buttons
        if (document.querySelector('.' + COPY_BUTTON_CLASS)) {
            console.log("Copy button already exists, skipping");
            return;
        }

        const pageHTML = document.body.innerHTML;

        const nameMatch = document.body.textContent.match(/\b([A-Za-z0-9_]+)\s+likes\b/i);
        const petName = nameMatch ? nameMatch[1].trim() : null;

        let petColor = null;
        let petSpecies = null;

        if (petName) {
            // Match the structure: <div...>petName the <span ...>Color</span> Species
            const colorSpeciesRegex = new RegExp(`${petName}\\s+the\\s*<span[^>]*>([^<]+)<\\/span>\\s*([A-Za-z]+)`, 'i');
            const colorSpeciesMatch = pageHTML.match(colorSpeciesRegex);

            if (colorSpeciesMatch) {
                petColor = colorSpeciesMatch[1].trim();
                petSpecies = colorSpeciesMatch[2].trim();
            }
        }


        const ageDayMatch = pageHTML.match(/<b>Age:<\/b>\s*<b>([\d,]+)<\/b>\s*days/i);
        const petAgeDays = ageDayMatch ? parseInt(ageDayMatch[1].replace(/,/g, '')) : null;

        const ageHourMatch = pageHTML.match(/\(<b>([\d,]+)<\/b>\s*hours\)/i);
        const petAgeHours = ageHourMatch ? parseInt(ageHourMatch[1].replace(/,/g, '')) : null;

        const levelMatch = pageHTML.match(/<b>Level:<\/b>\s*([\d,]+)/i);
        const petLevel = levelMatch ? parseInt(levelMatch[1]) : null;

        const birthdayMatch = document.body.textContent.match(/Birthday:\s+([\d]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+)/i);
        const petBirthday = birthdayMatch ? birthdayMatch[1].trim() : null;

        let formattedBirthday = null;


        if (petBirthday) {
            // Extract day and month from the matched birthday string
            const partsMatch = petBirthday.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/);

            if (partsMatch) {
                const day = partsMatch[1].padStart(2, '0');

                const monthNames = {
                    January: '01',
                    February: '02',
                    March: '03',
                    April: '04',
                    May: '05',
                    June: '06',
                    July: '07',
                    August: '08',
                    September: '09',
                    October: '10',
                    November: '11',
                    December: '12'
                };

                const month = monthNames[partsMatch[2]] || '??';
                formattedBirthday = `${month}-${day}`;


            } else {
                console.log('Could not parse day and month from birthday string');
            }
        } else {
            console.log('Birthday not found on page');
        }

        const { yearsOld, neopianYear } = convertPetAge({
            petAgeDays,
            petAgeHours
        });



        // Find the Petpet container that includes "has a Petpet!"
        const petpetContainer = Array.from(document.querySelectorAll('td')).find(td =>
                                                                                 td.innerHTML.includes("has a Petpet!")
                                                                                );

        let petpetName = null;
        let petpetColor = null;
        let petpetSpecies = null;
        let petpetAge = null;
        let isZapped = false;

        if (petpetContainer) {
            const html = petpetContainer.innerHTML;

            // Match petpet name, color, and species: <b>Oopsy</b> the Rainbow Doglefox
            const nameMatch = html.match(/<b>([^<]+)<\/b>\s+the\s+([A-Za-z]+)\s+([A-Za-z]+)/i);
            if (nameMatch) {
                petpetName = nameMatch[1].trim();
                petpetColor = nameMatch[2].trim();
                petpetSpecies = nameMatch[3].trim();
            }

            // Match age: (7286 days and 16 hours old)
            const ageMatch = html.match(/\(([\d,]+)\s+days/i);
            if (ageMatch) {
                petpetAge = parseInt(ageMatch[1].replace(/,/g, ""));
            }

            // Detect if zapped
            isZapped = html.includes("Zapped by the Petpet Lab Ray");
        }



        // Check for trophies
        const trophyImages = document.querySelectorAll('img[src*="trophies/trophy_"]');
        const hasTrophies = trophyImages.length > 0;
        const trophyNames = [];

        if (hasTrophies) {
            trophyImages.forEach(img => {
                const src = img.getAttribute('src');
                const trophyMatch = src.match(/trophy_([^_\.]+)/);
                if (trophyMatch) {
                    trophyNames.push(trophyMatch[1]);
                }
            });
        }



        // Create the !p button with a more visible style
        const copyButtonStyle = `
            color: #57a957;
            background-color: #f0fff0;
            border: 1px solid #57a957;
            padding: 2px 6px;
            margin: 0 5px;
            font-size: 1em;
            text-decoration: none;
            cursor: pointer;
            font-weight: bold;
            border-radius: 4px;
            display: inline-block;
        `;

        const copyButton = document.createElement('a');
        copyButton.textContent = '!p neobot';
        copyButton.setAttribute('style', copyButtonStyle);
        copyButton.setAttribute('href', 'javascript:void(0);');
        copyButton.classList.add(COPY_BUTTON_CLASS);
        copyButton.title = 'Copy pet information for bot';


        // Add click event to copy information
        copyButton.addEventListener('click', function() {
            let copyText = `!p ${petName} **Y${neopianYear}**`;

            if (petLevel) {
                copyText += `\nLevel: ${petLevel}`;
            }

            // Add petpet info if available
            if (petpetName && petpetColor && petpetSpecies) {
                copyText += `\nPetpet:(${petpetColor} ${petpetSpecies})`;
                if (petpetAge) {
                    copyText += ` - ${petpetAge} days`;
                }
                if (isZapped) {
                    copyText += " - zapped";
                }
            } else {
                copyText += `\nPetpet: None`;
            }

            // Add trophy info if available
            if (hasTrophies) {
                copyText += '\nTrophies: Yes';
                if (trophyNames.length > 0) {
                    copyText += ` (${trophyNames.join(', ')})`;
                }
            }

            console.log("Copying text:", copyText);

            // Copy to clipboard
            navigator.clipboard.writeText(copyText).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = '!p Copy Pet Info';
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy: ', err);
                copyButton.textContent = 'Error!';
                setTimeout(() => {
                    copyButton.textContent = '!p Copy Pet Info';
                }, 1500);
            });
        });

        const copyGoogleButton = document.createElement('a');
        copyGoogleButton.textContent = 'Google Sheet';
        copyGoogleButton.setAttribute('style', copyButtonStyle);
        copyGoogleButton.setAttribute('href', 'javascript:void(0);');
        copyGoogleButton.classList.add(COPY_BUTTON_CLASS);
        copyGoogleButton.title = 'Copy pet information for Trade Pool Google Sheet';

        // Add click event to copy information
        copyGoogleButton.addEventListener('click', function() {
            let copyText = `\t${petName}\t  \t ${petColor} \t ${petSpecies} \t Y${neopianYear} \t ${formattedBirthday || ''}` ;

            // Add trophy info if available
            if (hasTrophies) {
                copyText += '\t';
                if (trophyNames.length > 0) {
                    copyText += `${trophyNames.join(', ')}`;
                }
             } else {
                copyText += `\t`;
            }


            // Add petpet info if available
            if (petpetName && petpetColor && petpetSpecies) {
                copyText += ` \t ${petpetColor}, ${petpetSpecies},`;
                if (petpetAge) {
                    copyText += ` ${petpetAge} days,`;
                }
                if (isZapped) {
                    copyText += " zapped";
                }
            } else {
                copyText += `\t`;
            }

            console.log("Copying text:", copyText);

            // Copy to clipboard
            navigator.clipboard.writeText(copyText).then(() => {
                copyGoogleButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyGoogleButton.textContent = 'Google Sheet';
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy: ', err);
                copyGoogleButton.textContent = 'Error!';
                setTimeout(() => {
                    copyGoogleButton.textContent = 'Google Sheet';
                }, 1500);
            });
        });

        // Create a container div for the button to make it more prominent
        const buttonContainer = document.createElement('div');
        buttonContainer.style.padding = '5px';
        buttonContainer.style.margin = '5px 0';
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.backgroundColor = '#f0f0f0';
        buttonContainer.style.border = '1px solid #ccc';
        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(copyGoogleButton);

        // Force the button to be visible by inserting it at the top of the page
        const contentWrapper = document.querySelector('#content');
        if (contentWrapper) {
            contentWrapper.insertBefore(buttonContainer, contentWrapper.firstChild);
        } else {
            // If no content wrapper, try inserting after the header
            const header = document.querySelector('#header');
            if (header) {
                if (header.nextSibling) {
                    header.parentNode.insertBefore(buttonContainer, header.nextSibling);
                } else {
                    header.parentNode.appendChild(buttonContainer);
                }
            } else {
                // Last resort: insert at the beginning of the body
                document.body.insertBefore(buttonContainer, document.body.firstChild);
            }
        }
    }



        /**
     * Extracts pet information from the page
     * @param {string} petId - The ID of the pet (e.g., "pet0", "pet1")
     * @returns {Object} - The pet information object
     */
    function extractPetInfo(petId) {
        const petInfo = {
            name: '',
            level: '',
            strength: '',
            defense: '',
            speed: ''
        };

        // Get the pet name
        const nameElement = document.getElementById(`${petId}_name`);
        if (nameElement) {
            petInfo.name = nameElement.tagName === 'INPUT' ? nameElement.value : nameElement.textContent.trim();
        }

        // Direct lookup of pet attributes - most accurate method for Neopets pound page
        // The pound page has specific IDs for these attributes, petx_: name, level, str, def, speed,
        const levelElement = document.getElementById(`${petId}_level`);
        if (levelElement) {
            petInfo.level = levelElement.textContent.trim();
        }


        const strengthElement = document.getElementById(`${petId}_str`);
        if (strengthElement) {
            petInfo.strength = strengthElement.textContent.trim();
        }


        const defenseElement = document.getElementById(`${petId}_def`);
        if (defenseElement) {
            petInfo.defense = defenseElement.textContent.trim();
        }


        const speedElement = document.getElementById(`${petId}_speed`);
        if (speedElement) {
            petInfo.speed = speedElement.textContent.trim();
        }


        // Fallback methods if direct IDs aren't found
        // Direct lookup of pet attributes - most accurate method for Neopets pound page
        if (!petInfo.level || !petInfo.strength || !petInfo.defense || !petInfo.speed) {
        // The pound page has specific IDs for these attributes: petX_level, petX_str, petX_def, petX_speed
            // Try to find associated pet attributes by looking at nearby elements
        const speedElement = document.getElementById(`${petId}_speed`);
            if (nameElement) {
        if (speedElement) {
                // Method 1: Look for spans or divs with pet details nearby
            petInfo.speed = speedElement.textContent.trim();
                const petContainer = nameElement.closest('div[id^="pet"]');
        }
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

                                if (label.includes('level')) {
                                    petInfo.level = value;
                                } else if (label.includes('strength')) {
                                    petInfo.strength = value;
                                } else if (label.includes('defense')) {
                                    petInfo.defense = value;
                                } else if (label.includes('speed')) {
                                    petInfo.speed = value;
                                }
                            }
                        });
                    } else {
                        // If no table, look for specific elements
                        const allElements = petContainer.querySelectorAll('*');
                        allElements.forEach(element => {
                            const text = element.textContent.trim();
                            if (text.includes('Level:')) {
                                petInfo.level = text.replace('Level:', '').trim();
                            }
                            if (text.includes('Strength:')) {
                                petInfo.strength = text.replace('Strength:', '').trim();
                            }
                            if (text.includes('Defense:')) {
                                petInfo.defense = text.replace('Defense:', '').trim();
                            }
                            if (text.includes('Movement:')) {
                                petInfo.speed = text.replace('Movement:', '').trim();
                            }
                        });
                    }
                }


                // Method 2: Look in nearby "pet details" container
                const petDetailsContainer = nameElement.closest('.pet-row, .pet-details, .petdetails, .pet-container');
                if (petDetailsContainer) {
                    const detailsText = petDetailsContainer.textContent;

                    // Extract Level
                    const levelMatch = detailsText.match(/Level:\s*([0-9]*$)/);
                    if (levelMatch && levelMatch[1]) {
                        petInfo.level = levelMatch[1].trim();
                    }

                    // Extract strength
                    const strengthMatch = detailsText.match(/Strength:\s*([0-9]*$)/);
                    if (strengthMatch && strengthMatch[1]) {
                        petInfo.strength = strengthMatch[1].trim();
                    }

                    // Extract Defense
                    const defenseMatch = detailsText.match(/Defense:\s*([0-9]*$)/);
                    if (defenseMatch && defenseMatch[1]) {
                        petInfo.defense = defenseMatch[1].trim();
                    }

                    // Extract Movement
                    const speedMatch = detailsText.match(/Movement:\s*([0-9]*$)/);
                    if (speedMatch && speedMatch[1]) {
                        petInfo.speed = speedMatch[1].trim();
                    }

                }
            }
        }

        // For test page compatibility - directly extract from data attributes if available
        if (nameElement && nameElement.dataset) {
            if (nameElement.dataset.level) petInfo.level = nameElement.dataset.level;
            if (nameElement.dataset.strength) petInfo.strength = nameElement.dataset.strength;
            if (nameElement.dataset.defense) petInfo.defense = nameElement.dataset.defense;
            if (nameElement.dataset.speed) petInfo.speed = nameElement.dataset.speed;

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

            // Format: !p name, level, strength, defense, movement
            const clipboardText = `!p ${petInfo.name} \n LVL: ${petInfo.level} \n STR: ${petInfo.strength} \n DEF: ${petInfo.defense} \n MOV: ${petInfo.speed}`;

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
                                node.querySelector('[id*="_level"]') ||
                                node.querySelector('[id*="_str"]') ||
                                node.querySelector('[id*="_def"]') ||
                                node.querySelector('[id*="_speed"]')
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
                        node.id.includes('_name')||
                        node.id.includes('_level')||
                        node.id.includes('_str') ||
                        node.id.includes('_def')||
                        node.id.includes('_speed')
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
