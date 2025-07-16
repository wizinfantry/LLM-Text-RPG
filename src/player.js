// src/player.js - Defines the player character, including weapon equipping and attack power reflection.

import { StatType, GAME_CONSTANTS, DEFAULT_PLAYER_STATS, DEFAULT_PLAYER_BASE_HP } from './config.js';
import { Bar } from './bar.js';
import { Stats } from './stats.js';
import { Level } from './level.js';
import { logger, applyColor, COLORS } from './utils.js';

export class Player {
    constructor({ name, stats, hp, mp, exp, level, gold, inventory, equippedWeapon }) {
        this.name = name || "Elf Warrior"; // Default name
        this.gold = gold || 0;

        // Leveling system
        this.level = new Level(level || 1, exp || 0);

        // Initialize stats
        this.stats = new Stats(stats || DEFAULT_PLAYER_STATS);

        // Initialize HP and MP bars
        const initialMaxHp = hp || this.maxHp;
        this.hpBar = new Bar(initialMaxHp, this.maxHp);
        const initialMaxMp = mp || this.maxMp;
        this.mpBar = new Bar(initialMaxMp, this.maxMp);

        // Inventory and equipped items
        this.inventory = inventory || [];
        // Set default weapon for new players or load existing
        this.equippedWeapon = equippedWeapon || {
            name: "Worn Dagger",
            type: "Weapon",
            damage: "1d4", // Base weapon damage
            effect: "None"
        };
        logger.info(`New player ${this.name} (Elf Warrior, Lv.${this.level.value}) has been created.`);
        this.printStats();
    }

    // --- Stat-related Getters ---
    get maxHp() {
        return DEFAULT_PLAYER_BASE_HP + (this.level.value * 5) + (this.stats.getBonus(StatType.CONSTITUTION) * 2);
    }

    get maxMp() {
        return 10 + (this.level.value * 2) + (this.stats.getBonus(StatType.INTELLIGENCE) * 1);
    }

    get attackPower() {
        // Base attack power + Strength stat bonus + equipped weapon damage
        let baseAttack = 5 + this.stats.getBonus(StatType.STRENGTH);
        
        if (this.equippedWeapon && this.equippedWeapon.damage) {
            // Here, we could roll dice on each turn. For simplicity,
            // we'll use a fixed value based on the weapon's damage die.
            // Extract the number from the damage string (e.g., "1d6" -> 6)
            const damageDie = parseInt(this.equippedWeapon.damage.split('d')[1]);
            baseAttack += damageDie / 2 + 1; // Add approx. average value + 1 for tangible effect
        }
        return Math.floor(Math.max(1, baseAttack));
    }

    get defense() {
        // Base defense + Dexterity or Constitution stat bonus
        return 2 + this.stats.getBonus(StatType.DEXTERITY); // Half of Dexterity stat (example)
    }

    get hitChance() {
        // Hit Chance = Base Hit Chance + (Dexterity Bonus * 2%)
        return GAME_CONSTANTS.BASE_HIT_CHANCE + (this.stats.getBonus(StatType.DEXTERITY) * 2);
    }

    get evasionRate() {
        // Evasion Rate = Base Evasion Rate + (Dexterity Bonus * 1%)
        return GAME_CONSTANTS.BASE_EVASION_RATE + (this.stats.getBonus(StatType.DEXTERITY) * 1);
    }

    get criticalChance() {
        // Critical Chance = Base Critical Chance + (Luck/Dexterity Bonus * 0.5%)
        // Assuming a LUCK stat doesn't exist, fallback to DEXTERITY
        return GAME_CONSTANTS.BASE_CRITICAL_CHANCE + (this.stats.getBonus(StatType.LUCK || StatType.DEXTERITY) * 0.5);
    }

    // --- Action Methods ---
    takeDamage(amount) {
        this.hpBar.value -= amount;
        logger.info(`${applyColor(this.name, COLORS.GREEN)}: ${applyColor(`Took ${amount} damage.`, COLORS.RED)} Remaining HP: ${this.hpBar.toString()}`);
        if (this.hpBar.isEmpty()) {
            logger.info(`${applyColor(this.name, COLORS.RED)} has fallen.`);
            return true; // Defeated
        }
        return false; // Still alive
    }

    heal(amount) {
        this.hpBar.value += amount;
        logger.info(`${applyColor(this.name, COLORS.GREEN)}: Healed for ${amount} HP. Remaining HP: ${this.hpBar.toString()}`);
    }

    gainExp(amount) {
        const hasLeveledUp = this.level.gainExp(amount);
        logger.info(`${applyColor(this.name, COLORS.GREEN)} gained ${amount} experience. Current EXP: ${this.level.exp}/${this.level.expToNextLevel}`);
        if (hasLeveledUp) {
            this.levelUp();
        }
    }

    levelUp() {
        logger.info(applyColor(`Congratulations! ${this.name} has reached Level ${this.level.value}!`, COLORS.BRIGHT + COLORS.YELLOW));
        this.hpBar.max = this.maxHp; // Increase max HP
        this.hpBar.value = this.hpBar.max; // Fully heal HP
        this.mpBar.max = this.maxMp; // Increase max MP
        this.mpBar.value = this.mpBar.max; // Fully restore MP
        this.printStats();
        this.printBars();
    }

    /**
     * Equips a weapon.
     * @param {object} weapon - The weapon object to equip.
     */
    equipWeapon(weapon) {
        if (weapon.type !== "Weapon") {
            logger.warn(`${weapon.name} is not a weapon and cannot be equipped.`);
            return;
        }

        // If a weapon is already equipped, return it to the inventory
        if (this.equippedWeapon) {
            this.inventory.push(this.equippedWeapon);
            logger.info(`Returning ${applyColor(this.equippedWeapon.name, COLORS.BRIGHT + COLORS.YELLOW)} to inventory and equipping new weapon.`);
        }

        this.equippedWeapon = weapon;
        // Remove the equipped weapon from inventory if it exists there
        const index = this.inventory.indexOf(weapon);
        if (index > -1) {
            this.inventory.splice(index, 1);
        }
        logger.info(`${applyColor(this.name, COLORS.GREEN)} equipped ${applyColor(weapon.name, COLORS.BRIGHT + COLORS.YELLOW)}!`);
        this.printStats(); // Print stats to show changes
    }

    // --- Information Display Methods ---
    printStats() {
        logger.info(`--- Stats ---`);
        for (const statKey in StatType) {
            const statName = StatType[statKey];
            const statValue = this.stats.get(statName);
            const bonus = this.stats.getBonus(statName);
            logger.info(`${statName}: ${statValue} (${bonus >= 0 ? '+' : ''}${bonus})`);
        }
        logger.info(`-------------`);
        logger.info(`Attack Power: ${this.attackPower}, Defense: ${this.defense}`);
        logger.info(`Hit: ${this.hitChance.toFixed(1)}%, Evasion: ${this.evasionRate.toFixed(1)}%, Critical: ${this.criticalChance.toFixed(1)}%`);
        if (this.equippedWeapon) {
            logger.info(`Equipped Weapon: ${applyColor(this.equippedWeapon.name, COLORS.BRIGHT + COLORS.YELLOW)} (Damage: ${this.equippedWeapon.damage})`);
        }
    }

    printBars() {
        logger.info(`HP: ${this.hpBar.toString()}`);
        logger.info(`MP: ${this.mpBar.toString()}`);
        logger.info(`EXP: ${this.level.exp}/${this.level.expToNextLevel} (To Next: ${this.level.expToNextLevel - this.level.exp})`);
        logger.info(`Gold: ${this.gold}`);
    }
}