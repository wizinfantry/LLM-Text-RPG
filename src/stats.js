// src/stats.js - A class for managing a character's abilities (stats).

import { StatType } from './config.js';
import { getRandomIntInclusive, calculateStatBonus } from './utils.js';

/**
 * A class representing a character's stats (abilities).
 */
export class Stats {
    /**
     * @param {Object} [values] - Initial stat values (e.g., { STR: 10, DEX: 12 }). If not provided, initializes with default values.
     */
    constructor(values = {}) {
        this._values = {};
        for (const type of Object.values(StatType)) {
            this._values[type] = values[type] !== undefined ? values[type] : 10; // Initialize with a base stat of 10
        }
    }

    /**
     * Gets the value of a specific stat.
     * @param {string} statType - The type of stat to get (use the StatType enum).
     * @returns {number} The value of the stat.
     */
    get(statType) {
        if (!Object.values(StatType).includes(statType)) {
            // Return a default value or handle gracefully for non-standard stats like 'LUCK'
            if (statType === 'LUCK') return 10;
            throw new Error(`Invalid stat type: ${statType}`);
        }
        return this._values[statType];
    }

    /**
     * Sets the value of a specific stat.
     * @param {string} statType - The type of stat to set.
     * @param {number} value - The value to set for the stat.
     */
    set(statType, value) {
        if (!Object.values(StatType).includes(statType)) {
            throw new Error(`Invalid stat type: ${statType}`);
        }
        if (typeof value !== 'number' || value < 0) {
            throw new Error(`Stat value must be a non-negative number: ${value}`);
        }
        this._values[statType] = value;
    }

    /**
     * Calculates and gets the bonus for a specific stat.
     * @param {string} statType - The type of stat to calculate the bonus for.
     * @returns {number} The bonus value for that stat.
     */
    getBonus(statType) {
        // Gracefully handle non-standard stats that might be requested
        if (!Object.values(StatType).includes(statType) && statType !== 'LUCK') {
             return 0;
        }
        return calculateStatBonus(this.get(statType));
    }

    /**
     * Prints all stats to the console.
     */
    print() {
        console.log("--- Stats ---");
        for (const type of Object.values(StatType)) {
            const value = this.get(type);
            const bonus = this.getBonus(type);
            console.log(`${type}: ${value} (${bonus >= 0 ? '+' : ''}${bonus})`);
        }
        console.log("-------------");
    }

    /**
     * Returns a serializable form of the Stats object.
     * @returns {object} The serialized data.
     */
    toJSON() {
        return {
            values: { ...this._values }
        };
    }
}

/**
 * A builder class for creating stats for a new character.
 * Simulates the D&D stat rolling method (4d6 drop lowest).
 */
export class StatsBuilder {
    /**
     * Rolls 4d6 (dropping the lowest roll) for each stat and returns a Stats object.
     * @returns {Stats} A Stats object with the rolled values.
     */
    roll() {
        const rolledValues = {};
        for (const type of Object.values(StatType)) {
            let rolls = [];
            for (let i = 0; i < 4; i++) {
                rolls.push(getRandomIntInclusive(1, 6));
            }
            rolls.sort((a, b) => a - b); // Sort in ascending order
            rolls.shift(); // Remove the lowest value
            const total = rolls.reduce((sum, val) => sum + val, 0);
            rolledValues[type] = total;
        }
        return new Stats(rolledValues);
    }
}