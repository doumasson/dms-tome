import { test, expect } from '@playwright/test';

test.describe('Game Integration Tests', () => {
  test('should load game with auto-login and reach PixiJS map', async ({ page }) => {
    // Enable auto-login via environment variable
    process.env.VITE_DEV_AUTO_LOGIN = 'agent@test.local';

    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for auto-login to complete
    await page.waitForLoadState('networkidle');

    // Should redirect to campaign select
    await page.waitForURL('**/campaigns', { timeout: 10000 });

    // Select "Agent Test Campaign"
    const campaignCard = page.locator('text=Agent Test Campaign').first();
    await expect(campaignCard).toBeVisible({ timeout: 5000 });
    await campaignCard.click();

    // Should navigate to character select
    await page.waitForURL('**/select', { timeout: 5000 });

    // Select "Aric Shadowblade" character
    const characterOption = page.locator('text=Aric Shadowblade').first();
    await expect(characterOption).toBeVisible({ timeout: 5000 });
    await characterOption.click();

    // Should navigate to game and render PixiJS canvas
    await page.waitForURL(/^\w+.*\/game/, { timeout: 10000 });

    // Wait for the PixiJS canvas to be visible
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Verify HUD elements are visible
    await expect(page.locator('.hud-bottom-bar')).toBeVisible({ timeout: 5000 });

    // Verify we can see the narrator bar
    await expect(page.locator('.narrator-bar')).toBeVisible({ timeout: 5000 });

    // Screenshot the game state
    await page.screenshot({ path: 'test-results/game-state.png' });
  });
});
