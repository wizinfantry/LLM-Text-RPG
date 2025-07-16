// src/level.js - Class for managing player level and experience.

// Define constants for experience required to level up here.
const LEVEL_CONSTANTS = {
    BASE_EXP_TO_NEXT_LEVEL: 100, // Base experience needed for the next level
    EXP_MULTIPLIER_PER_LEVEL: 1.5 // Experience multiplier per level
};

export class Level {
    constructor(initialLevel = 1, initialExp = 0) {
        this.value = initialLevel; // Current level
        this.exp = initialExp;     // Current experience
        this.expToNextLevel = this.calculateExpToNextLevel(); // Total experience needed for the next level
    }

    /**
     * Calculates the experience required for the next level up.
     * @returns {number} Total experience required for the next level.
     */
    calculateExpToNextLevel() {
        // Increases in a manner like (base_exp * (level * multiplier_per_level))
        return Math.floor(LEVEL_CONSTANTS.BASE_EXP_TO_NEXT_LEVEL * (this.value * LEVEL_CONSTANTS.EXP_MULTIPLIER_PER_LEVEL));
    }

    /**
     * Gains experience.
     * @param {number} amount - The amount of experience to gain.
     * @returns {boolean} - True if a level-up occurred, false otherwise.
     */
    gainExp(amount) {
        this.exp += amount;
        return this.checkAndProcessLevelUp();
    }

    /**
     * Checks for level-up conditions and processes the level-up if met.
     * @returns {boolean} True if a level-up occurred, false otherwise.
     */
    checkAndProcessLevelUp() {
        let leveledUp = false;
        // Handle multiple level-ups at once if a large amount of EXP is gained
        while (this.exp >= this.expToNextLevel) {
            this.levelUp();
            leveledUp = true;
        }
        return leveledUp;
    }

    /**
     * Processes the level-up.
     */
    levelUp() {
        this.exp -= this.expToNextLevel; // Carry over remaining experience
        this.value++; // Increase level
        // Recalculate the experience needed for the new next level
        this.expToNextLevel = this.calculateExpToNextLevel();
    }
}