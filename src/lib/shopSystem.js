/**
 * shopSystem.js — Buy/sell logic for shop interactions.
 *
 * All prices are in gold pieces (integer).
 */

/**
 * Returns true if the player can afford an item.
 * @param {number} playerGold
 * @param {number} itemPrice
 * @returns {boolean}
 */
export function canBuy(playerGold, itemPrice) {
  return playerGold >= itemPrice
}

/**
 * Calculates the sell price for an item (50% of base, minimum 1 gp).
 * @param {number} basePrice
 * @returns {number}
 */
export function calculateSellPrice(basePrice) {
  return Math.max(1, Math.floor(basePrice / 2))
}

/**
 * Attempts to buy an item.
 * @param {{ name: string, price: number, type: string }} item
 * @param {number} playerGold
 * @returns {{ success: true, newGold: number, item: object } | { success: false, reason: string }}
 */
export function buyItem(item, playerGold) {
  if (!canBuy(playerGold, item.price)) {
    return {
      success: false,
      reason: `Not enough gold. Need ${item.price} gp, have ${playerGold} gp.`,
    }
  }
  return {
    success: true,
    newGold: playerGold - item.price,
    item,
  }
}

/**
 * Sells an item, returning the gold gained (50% of base price, min 1 gp).
 * @param {{ name: string, price: number, type: string }} item
 * @returns {{ success: true, goldGained: number }}
 */
export function sellItem(item) {
  return {
    success: true,
    goldGained: calculateSellPrice(item.price),
  }
}
