// main.js - Main loop for an Elf D&D Adventure Game (with LLM monster generation integration)

import { Player } from './src/player.js';
import { createLLMMonster } from './src/monster.js'; // Import createLLMMonster instead of a static monster generator
import { getGemmaResponse } from './src/ollama_client.js';
import { logger, applyColor, COLORS, getRandomIntInclusive, odds } from './src/utils.js';
import { GAME_CONSTANTS, ItemType } from './src/config.js';

// Game Settings
const GAME_LOOP_DELAY_MS = 1000; // Delay between each turn in milliseconds

/**
 * Main function to start and run the game.
 */
async function startGame() {
    logger.info("Starting the Elf D&D Adventure Game...");
    logger.info(applyColor("Brave elf, are you ready for a relentless fight?", COLORS.YELLOW));

    // Create the player character
    const player = new Player({ name: "Arwen" }); // Set the elf warrior's name to 'Arwen'

    // Start the main game loop
    let combatCount = 0;
    while (true) {
        combatCount++;
        logger.info(`\n--- New Combat #${combatCount} ---`);
        
        // Generate a monster via LLM, passing the player's level for difficulty scaling
        const monster = await createLLMMonster(player.level.value, "A monster roaming the forest");

        logger.info(applyColor(`A battle with ${monster.name} (${monster.description}) begins!`, COLORS.RED));
        // The monster's description is now generated along with the monster object,
        // so we can use it directly.
        logger.info(applyColor(`Description: ${monster.description}`, COLORS.MAGENTA));


        // Combat Phase
        let turn = 0;
        while (!player.hpBar.isEmpty() && !monster.hpBar.isEmpty()) {
            turn++;
            logger.info(`\n--- Turn ${turn} ---`);

            // 1. Player's Turn
            logger.info(`${applyColor(player.name, COLORS.GREEN)}'s turn!`);
            if (odds(player.hitChance / 100)) { // Assuming hitChance is out of 100
                // Check for a critical hit
                const isCritical = odds(player.criticalChance / 100); // Assuming criticalChance is out of 100
                let damage = player.attackPower;
                if (isCritical) {
                    damage = Math.floor(damage * GAME_CONSTANTS.CRITICAL_MULTIPLIER);
                    logger.info(`${applyColor('Critical Hit! ', COLORS.BRIGHT + COLORS.RED)}`);
                }

                // Apply monster's defense, ensuring at least 1 point of damage
                const actualDamage = Math.max(1, damage - Math.floor(monster.defense)); 

                logger.info(`${applyColor(player.name, COLORS.GREEN)} dealt ${actualDamage} damage to ${applyColor(monster.name, COLORS.MAGENTA)}.`);
                monster.takeDamage(actualDamage);
            } else {
                logger.info(`${applyColor(player.name, COLORS.GREEN)}'s attack on ${applyColor(monster.name, COLORS.MAGENTA)} missed!`);
            }

            // Check if the monster was defeated
            if (monster.hpBar.isEmpty()) {
                logger.info(`${applyColor(monster.name, COLORS.MAGENTA)} has been ${applyColor('defeated!', COLORS.GREEN)}`);
                break;
            }

            // 2. Monster's Turn (Utilizing LLM for action description)
            logger.info(`${applyColor(monster.name, COLORS.MAGENTA)}'s turn!`);
            const monsterAction = await monster.chooseAction(player); // The LLM chooses a descriptive action for the monster.

            // The game's code executes the action based on the 'type' returned by the LLM.
            if (monsterAction.type === 'attack') {
                if (odds(monster.hitChance / 100)) { // Assuming hitChance is out of 100
                    const isCritical = odds(monster.criticalChance / 100); // Assuming criticalChance is out of 100
                    let damage = monster.attackPower;
                    if (isCritical) {
                        damage = Math.floor(damage * GAME_CONSTANTS.CRITICAL_MULTIPLIER);
                        logger.info(`${applyColor('Critical Hit! ', COLORS.BRIGHT + COLORS.RED)}`);
                    }
                    
                    // Calculate damage after player's defense
                    let actualDamage = Math.max(1, damage - Math.floor(player.defense));
                    
                    // Check if the player evades the attack
                    if (odds(player.evasionRate / 100)) { // Assuming evasionRate is out of 100
                        logger.info(`${applyColor(player.name, COLORS.GREEN)} dodged the attack from ${applyColor(monster.name, COLORS.MAGENTA)}!`);
                        actualDamage = 0;
                    } else {
                        logger.info(`${applyColor(monster.name, COLORS.MAGENTA)} dealt ${actualDamage} damage to ${applyColor(player.name, COLORS.GREEN)}.`);
                    }
                    player.takeDamage(actualDamage);
                } else {
                    logger.info(`${applyColor(monster.name, COLORS.MAGENTA)}'s attack on ${applyColor(player.name, COLORS.GREEN)} missed!`);
                }
            } else if (monsterAction.type === 'defend') {
                // Logic for a defensive stance could be implemented here (e.g., temporary defense boost).
                // Currently, it only provides a description.
            }
            // Other action types from the LLM could be handled here.

            player.printBars(); // Display player's HP/MP/EXP bars

            // Check if the player was defeated
            if (player.hpBar.isEmpty()) {
                logger.error(`${applyColor(player.name, COLORS.RED)} has fallen in battle! Game Over.`);
                process.exit(0); // Terminate the game
            }

            // A short delay to make the turn-based combat readable
            await new Promise(resolve => setTimeout(resolve, GAME_LOOP_DELAY_MS));
        }

        // Process combat results (if monster is defeated)
        if (monster.hpBar.isEmpty()) {
            player.gainExp(monster.baseExp); // Gain experience points
            player.gold += getRandomIntInclusive(5, 15); // Gain a random amount of gold

            // --- Added Section Start ---
            // Fully restore the player's health and mana after a victorious battle.
            logger.info(applyColor("Victory! Arwen's health and mana are restored.", COLORS.BRIGHT + COLORS.GREEN));
            player.hpBar.value = player.hpBar.max; // Restore HP to max
            player.mpBar.value = player.mpBar.max; // Restore MP to max
            // --- Added Section End ---

            // Item drop check
            if (odds(monster.dropChance)) {
                logger.info(`${applyColor(monster.name, COLORS.MAGENTA)} dropped an item!`);
                // Prompt for the LLM to generate a D&D-style weapon in JSON format.
                const itemPrompt = `
                Please generate a weapon item for a D&D-style game in JSON format. 
                Generate only a single item and follow this format strictly:
                {
                  "name": "Item Name",
                  "type": "Weapon", 
                  "damage": "1d6",
                  "effect": "Special effect (e.g., +1 STR, bonus damage to monsters)"
                }
                Your response must only contain the JSON code block. Do not include any other explanations.
                `;
                try {
                    // Call the LLM and parse the response
                    const itemResponseText = await getGemmaResponse(itemPrompt, 'gemma3:latest');
                    let jsonString = itemResponseText.trim();
                    if (jsonString.startsWith("```json")) {
                        jsonString = jsonString.substring(7, jsonString.lastIndexOf("```")).trim();
                    } else if (jsonString.startsWith("```")) {
                        jsonString = jsonString.substring(3, jsonString.lastIndexOf("```")).trim();
                    }
                    const newItem = JSON.parse(jsonString);
                    
                    // --- Added Section Start ---
                    // Logic to handle the newly acquired item.
                    if (newItem.type === "Weapon") {
                        // Parse the new weapon's damage die (e.g., "1d6" -> 6)
                        const newItemDamageDie = parseInt(newItem.damage.split('d')[1]);
                        const equippedWeaponDamageDie = player.equippedWeapon ? parseInt(player.equippedWeapon.damage.split('d')[1]) : 0; // 0 if no weapon is equipped
                        
                        // Equip the new weapon only if it's better than the current one.
                        if (!player.equippedWeapon || newItemDamageDie > equippedWeaponDamageDie) {
                            player.equipWeapon(newItem); // Equip the better weapon
                        } else {
                            // Otherwise, add it to the inventory.
                            player.inventory.push(newItem);
                            logger.info(`${applyColor(player.name, COLORS.GREEN)} acquired ${applyColor(newItem.name, COLORS.BRIGHT + COLORS.YELLOW)}! (Inventory: ${player.inventory.length} items)`);
                        }
                    } else { // If the item is not a weapon, add it to the inventory.
                        player.inventory.push(newItem);
                        logger.info(`${applyColor(player.name, COLORS.GREEN)} acquired ${applyColor(newItem.name, COLORS.BRIGHT + COLORS.YELLOW)}! (Inventory: ${player.inventory.length} items)`);
                    }
                    // --- Added Section End ---
                } catch (error) {
                    logger.error("Error during item generation LLM call or JSON parsing:", error.message);
                }
            } else {
                logger.info(`${applyColor(monster.name, COLORS.MAGENTA)} did not drop anything.`);
            }

            player.printBars(); // Show final status after combat rewards
        }

        // Delay before starting the next combat encounter
        await new Promise(resolve => setTimeout(resolve, GAME_LOOP_DELAY_MS * 2));
    }
}

// Start the game execution
startGame();