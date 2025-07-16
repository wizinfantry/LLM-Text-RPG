// src/monster.js - Defines the monster character, including LLM generation.

import { StatType, GAME_CONSTANTS } from './config.js'; // MONSTERS are no longer used directly
import { Bar } from './bar.js';
import { Stats } from './stats.js';
import { applyColor, COLORS, logger } from './utils.js';
import { getGemmaResponse } from './ollama_client.js'; // Import Ollama client

export class Monster {
    constructor(monsterData) {
        if (!monsterData || !monsterData.name || !monsterData.stats || !monsterData.hp) {
            throw new Error("Valid monster data (name, stats, hp) must be provided.");
        }
        this.name = monsterData.name;
        this.description = monsterData.description || "An ordinary monster."; // Description provided by LLM
        this.baseExp = monsterData.base_exp || 10; // From LLM or default
        this.dropChance = monsterData.drop_chance || 0.5; // From LLM or default
        this.specialAbilities = monsterData.special_abilities || []; // Special abilities from LLM

        // Initialize stats
        const { HP, ...coreStats } = monsterData.stats; // HP is managed separately, excluded from Stats class
        this.stats = new Stats(coreStats);

        // Initialize HP bar
        this.hpBar = new Bar(monsterData.hp, monsterData.hp);

        logger.info(`${applyColor('A new monster', COLORS.MAGENTA)} ${this.name} (HP: ${this.hpBar.toString()}) appears!`);
    }

    get maxHp() {
        return this.hpBar.max;
    }

    get attackPower() {
        return Math.max(1, this.stats.get(StatType.STRENGTH) || 5);
    }


    get defense() {
        return Math.max(0, (this.stats.get(StatType.CONSTITUTION) || 1) / 2);
    }

    get hitChance() {
        return GAME_CONSTANTS.BASE_HIT_CHANCE;
    }

    get evasionRate() {
        return GAME_CONSTANTS.BASE_EVASION_RATE;
    }

    get criticalChance() {
        return GAME_CONSTANTS.BASE_CRITICAL_CHANCE;
    }

    // --- Action Methods ---
    takeDamage(amount) {
        this.hpBar.value -= amount;
        logger.info(`${applyColor(this.name, COLORS.MAGENTA)}: ${applyColor(`Took ${amount} damage.`, COLORS.RED)} Remaining HP: ${this.hpBar.toString()}`);
        if (this.hpBar.isEmpty()) {
            logger.info(`${applyColor(this.name, COLORS.RED)} was defeated.`);
            return true;
        }
        return false;
    }

    async chooseAction(player) {
        // Prompt for the LLM to decide the monster's action
        const actionPrompt = `You are a D&D Game Master. The monster ${this.name} is fighting ${player.name} (${player.hpBar.toString()}). The monster's current HP is ${this.hpBar.toString()}, and its special abilities are ${this.specialAbilities.join(', ') || 'none'}. Decide the monster's action for the next turn (e.g., attack, use a specific skill, bolster defense, attempt to flee) and provide the action type in JSON format along with a description.
JSON format: {"action_type": "attack", "description": "Description of the attack."}
Your response must only contain the JSON code block. Do not include any other explanations.`;

        let llmResponse;
        try {
            llmResponse = await getGemmaResponse(actionPrompt, 'gemma3:latest');
            let jsonString = llmResponse.trim();
            if (jsonString.startsWith("```json")) {
                jsonString = jsonString.substring(7, jsonString.lastIndexOf("```")).trim();
            } else if (jsonString.startsWith("```")) {
                jsonString = jsonString.substring(3, jsonString.lastIndexOf("```")).trim();
            }
            const actionData = JSON.parse(jsonString);

            logger.info(applyColor(`\n${actionData.description}`, COLORS.CYAN)); // Action described by the LLM
            
            // Determine the actual game logic based on the action_type suggested by the LLM
            // Note: The game logic uses English keywords.
            if (actionData.action_type.toLowerCase() === 'attack') {
                return { type: 'attack', target: player };
            } else if (actionData.action_type.toLowerCase() === 'defend' || actionData.action_type.toLowerCase().includes('defense')) {
                logger.info(`${this.name} takes a defensive stance!`);
                return { type: 'defend' };
            }
            // Add logic for other action types here
            return { type: 'attack', target: player }; // Default to attack
        } catch (error) {
            logger.error("Error during LLM monster action decision or JSON parsing:", error.message);
            // For debugging, print the raw response if JSON parsing fails.
            logger.error("Raw LLM Response (parsing failed):", llmResponse);
            return { type: 'attack', target: player }; // Fallback to a basic attack on error
        }
    }
}

/**
 * Dynamically creates a monster using an LLM.
 * @param {number} playerLevel - The current level of the player.
 * @param {string} generationPromptHint - A hint for the LLM for monster creation (e.g., "A weak monster in the forest", "A mid-boss in a dungeon").
 * @returns {Promise<Monster>} A newly created monster object.
 */
export async function createLLMMonster(playerLevel, generationPromptHint = "A small forest monster") {
    // Provide difficulty adjustment tips based on player level
    let difficultyHint = "";
    let minHp, maxHp, minStat, maxStat, baseExp;

    if (playerLevel <= 3) {
        difficultyHint = "Please create a monster with low HP and stats, easy for a novice player to handle.";
        minHp = 10; maxHp = 25;
        minStat = 5; maxStat = 12;
        baseExp = 10 + (playerLevel - 1) * 5;
    } else if (playerLevel <= 7) {
        difficultyHint = "Please create a monster with moderate HP and stats, suitable for an intermediate player.";
        minHp = 25; maxHp = 50;
        minStat = 8; maxStat = 15;
        baseExp = 20 + (playerLevel - 3) * 10;
    } else {
        difficultyHint = "Please create a challenging monster with high HP and stats for an experienced player.";
        minHp = 50; maxHp = 100;
        minStat = 12; maxStat = 18;
        baseExp = 50 + (playerLevel - 7) * 15;
    }

    const prompt = `
    You are a D&D style Game Master. The player is currently level ${playerLevel}.
    Create a new monster that fits the description: "${generationPromptHint}".
    ${difficultyHint}
    You must provide the monster's stats (HP, STR, DEX, CON, INT, WIS, CHA), name, a short description, and special abilities in JSON format.
    Set HP roughly between ${minHp}-${maxHp}, and stats between ${minStat}-${maxStat}.
    Write 1-2 special abilities briefly.
    Set base_exp, the base experience for defeating the monster, to around ${baseExp}.
    
    JSON format:
    {
      "name": "Monster Name",
      "description": "A short description of the monster",
      "hp": ${minHp + Math.floor((maxHp - minHp) / 2)},
      "base_exp": ${baseExp},
      "drop_chance": 0.6,
      "stats": {
        "STR": ${minStat},
        "DEX": ${minStat},
        "CON": ${minStat},
        "INT": ${minStat},
        "WIS": ${minStat},
        "CHA": ${minStat}
      },
      "special_abilities": [
        "Ability 1: Description",
        "Ability 2: Description"
      ]
    }
    Your response must only contain the JSON code block. Do not include any other explanations.
    `;

    logger.info(applyColor(`Requesting LLM to generate a monster: (for Lv.${playerLevel}) "${generationPromptHint}"`, COLORS.YELLOW));

    let llmResponse;
    try {
        llmResponse = await getGemmaResponse(prompt, 'gemma3:latest');
        
        let jsonString = llmResponse.trim();
        if (jsonString.startsWith("```json")) {
            jsonString = jsonString.substring(7, jsonString.lastIndexOf("```")).trim();
        } else if (jsonString.startsWith("```")) {
            jsonString = jsonString.substring(3, jsonString.lastIndexOf("```")).trim();
        }

        const monsterData = JSON.parse(jsonString);
        logger.info(applyColor(`LLM generated monster data: ${monsterData.name}`, COLORS.YELLOW));
        return new Monster(monsterData);

    } catch (error) {
        logger.error("Error during LLM monster generation or JSON parsing:", error.message);
        logger.error("Raw LLM Response (parsing failed):", llmResponse);
        // Return a basic fallback monster appropriate for the player's level on error
        return new Monster({
            name: "Error Monster",
            description: "A monster that failed to generate from the LLM. (Default Fallback)",
            hp: Math.min(maxHp, 15 + playerLevel * 2),
            base_exp: baseExp,
            drop_chance: 0.3,
            stats: { STR: 5 + Math.floor(playerLevel / 2), DEX: 5 + Math.floor(playerLevel / 2), CON: 5 + Math.floor(playerLevel / 2), INT: 5, WIS: 5, CHA: 5 },
            special_abilities: []
        });
    }
}