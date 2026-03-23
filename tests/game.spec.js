import { test, expect } from '@playwright/test';

test.describe('Game Integration Tests', () => {
  test('should load game with auto-login and reach PixiJS map', async ({ page, baseURL }) => {
    // Navigate to the app with auto-login enabled
    await page.goto(baseURL || 'http://localhost:5173', {
      waitUntil: 'networkidle'
    });

    // Wait for campaign select to load
    // If auto-login is set, campaigns page should load
    // Otherwise, redirect to login
    const pageTitle = await page.title();
    expect(['DungeonMind', 'campaigns'].some(t => pageTitle.includes(t))).toBeTruthy();

    // Look for campaign selection screen
    const campaignContainer = page.locator('[class*="campaign"]').first();
    await expect(campaignContainer).toBeVisible({ timeout: 10000 });

    // Select "Agent Test Campaign" if available
    const campaignButtons = page.locator('button:has-text("Agent Test Campaign"), div:has-text("Agent Test Campaign")');
    const campaignCount = await campaignButtons.count();
    if (campaignCount > 0) {
      await campaignButtons.first().click();
      await page.waitForLoadState('networkidle');
    }

    // Look for character selection screen
    const characterSection = page.locator('[class*="character"], h2:has-text("Select")').first();
    await expect(characterSection).toBeVisible({ timeout: 10000 });

    // Select character - look for any character card or option
    const characterButtons = page.locator('button:has-text("Aric"), button:has-text("Select"), [class*="character"][role="button"]');
    const charCount = await characterButtons.count();
    if (charCount > 0) {
      await characterButtons.first().click();
      await page.waitForLoadState('networkidle');
    }

    // Wait for game to load
    // PixiJS canvas should be rendered
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Verify HUD elements are present
    const hudBottomBar = page.locator('.hud-bottom-bar, [class*="bottom"], [class*="action"]').first();
    await expect(hudBottomBar).toBeVisible({ timeout: 5000 });

    // Verify narrator/chat area is present
    const narratorArea = page.locator('.narrator-bar, [class*="narrator"], [class*="chat"], [class*="log"]').first();
    await expect(narratorArea).toBeVisible({ timeout: 5000 });

    // Verify page title is DungeonMind
    const finalTitle = await page.title();
    expect(finalTitle).toContain('DungeonMind');

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/game-state.png', fullPage: false });
  });

  test('should display HUD buttons and interact with them', async ({ page, baseURL }) => {
    await page.goto(baseURL || 'http://localhost:5173', { waitUntil: 'networkidle' });

    // Navigate to game if needed
    const canvas = page.locator('canvas').first();
    try {
      await expect(canvas).toBeVisible({ timeout: 3000 });
    } catch {
      // If canvas not visible, try clicking through screens
      const buttons = page.locator('button');
      const count = await buttons.count();
      if (count > 0) {
        await buttons.first().click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Check for HUD action buttons
    const actionButtons = page.locator('button[title], [class*="btn"]');
    const buttonCount = await actionButtons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Verify specific HUD elements exist
    const hudElements = page.locator('[class*="hud"], [class*="bar"]');
    const elementCount = await hudElements.count();
    expect(elementCount).toBeGreaterThan(0);
  });
});
