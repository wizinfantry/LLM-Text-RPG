// src/utils.js - Common utility functions

/**
 * Selects a random element from a given array.
 * @param {Array<T>} arr - The array to select an element from.
 * @returns {T} The selected random element.
 */
export function choice(arr) {
    if (!arr || arr.length === 0) {
        return undefined;
    }
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

/**
 * Generates a random integer between 0 and max (inclusive).
 * @param {number} max - The maximum value.
 * @returns {number} A random integer.
 */
export function getRandomInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} A random integer.
 */
export function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Simulates a dice roll (e.g., "1d8", "2d6").
 * @param {string} diceNotation - The dice notation string (e.g., "1d8", "2d6").
 * @returns {number} The result of the roll.
 */
export function rollDice(diceNotation) {
    const parts = diceNotation.split('d');
    const numDice = parseInt(parts[0], 10);
    const dieSides = parseInt(parts[1], 10);
    let total = 0;
    for (let i = 0; i < numDice; i++) {
        total += getRandomIntInclusive(1, dieSides);
    }
    return total;
}

/**
 * Returns true/false based on a specific probability.
 * @param {number} probability - A probability between 0.0 and 1.0.
 * @returns {boolean} True or false, based on the probability.
 */
export function odds(probability) {
    return Math.random() < probability;
}

/**
 * A simple logging object.
 */
export const logger = {
    info: (...args) => console.log("[INFO]", ...args),
    warn: (...args) => console.warn("[WARN]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
    debug: (...args) => console.debug("[DEBUG]", ...args)
};

// Function to calculate stat bonus (can be expanded later if needed)
export function calculateStatBonus(statValue) {
    return Math.floor((statValue - 10) / 2); // D&D 5th edition style (example)
}

// ANSI escape codes for text color and style
export const COLORS = {
    RESET: "\x1b[0m",
    BRIGHT: "\x1b[1m",
    DIM: "\x1b[2m",
    UNDERSCORE: "\x1b[4m",
    BLINK: "\x1b[5m",
    REVERSE: "\x1b[7m",
    HIDDEN: "\x1b[8m",

    BLACK: "\x1b[30m",
    RED: "\x1b[31m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    BLUE: "\x1b[34m",
    MAGENTA: "\x1b[35m",
    CYAN: "\x1b[36m",
    WHITE: "\x1b[37m",

    BG_BLACK: "\x1b[40m",
    BG_RED: "\x1b[41m",
    BG_GREEN: "\x1b[42m",
    BG_YELLOW: "\x1b[43m",
    BG_BLUE: "\x1b[44m",
    BG_MAGENTA: "\x1b[45m",
    BG_CYAN: "\x1b[46m",
    BG_WHITE: "\x1b[47m"
};

/**
 * Applies color to a text string.
 * @param {string} text - The text to color.
 * @param {string} colorCode - The color code from the COLORS object.
 * @returns {string} The text with the applied color code.
 */
export function applyColor(text, colorCode) {
    return `${colorCode}${text}${COLORS.RESET}`;
}