// src/bar.js - A generic Bar class to manage a current value and a maximum value.

/**
 * The Bar class manages a current value (position) and a maximum value (max).
 * It can be used for HP, MP, EXP bars, etc.
 */
export class Bar {
    /**
     * @param {number} max - The maximum value of the bar.
     * @param {number} [initialPosition] - The initial value of the bar. Defaults to max.
     */
    constructor(max, initialPosition = max) {
        if (max <= 0) {
            throw new Error("The maximum value of a Bar must be greater than 0.");
        }
        this._max = max;
        this._position = Math.min(Math.max(0, initialPosition), max); // Clamp between 0 and max
    }

    /**
     * Gets the current value of the bar.
     * @returns {number} The current value.
     */
    get value() {
        return this._position;
    }

    /**
     * Sets the current value of the bar. It is automatically clamped between 0 and max.
     * @param {number} newPosition - The new value to set.
     */
    set value(newPosition) {
        this._position = Math.min(Math.max(0, newPosition), this._max);
    }

    /**
     * Gets the maximum value of the bar.
     * @returns {number} The maximum value.
     */
    get max() {
        return this._max;
    }

    /**
     * Sets the maximum value of the bar. The current value may be adjusted accordingly.
     * @param {number} newMax - The new maximum value to set.
     */
    set max(newMax) {
        if (newMax <= 0) {
            throw new Error("The maximum value of a Bar must be greater than 0.");
        }
        this._max = newMax;
        // If the max value is reduced, clamp the current value to the new max.
        if (this._position > this._max) {
            this._position = this._max;
        }
    }

    /**
     * Returns whether the bar is full.
     * @returns {boolean} True if the bar is full, otherwise false.
     */
    isFull() {
        return this._position >= this._max;
    }

    /**
     * Returns whether the bar is empty.
     * @returns {boolean} True if the bar's value is 0, otherwise false.
     */
    isEmpty() {
        return this._position <= 0;
    }

    /**
     * Returns the current value of the bar as a percentage.
     * @returns {number} A percentage between 0 and 100.
     */
    get percentage() {
        return (this._position / this._max) * 100;
    }

    /**
     * Returns the state of the bar as a string (e.g., "50/100").
     * @returns {string} The bar's state string.
     */
    toString() {
        return `${this._position}/${this._max}`;
    }

    /**
     * Returns a serializable form of the Bar object (for saving/loading).
     * @returns {object} The serialized data.
     */
    toJSON() {
        return {
            max: this._max,
            position: this._position
        };
    }
}