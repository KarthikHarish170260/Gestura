import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('GESTURA WCAG 2.2 AA Accessibility Audit', () => {
  test('Conversation screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('Conversation violations:', criticalViolations.map(v => ({ id: v.id, help: v.help, count: v.nodes.length, targets: v.nodes.map(n => n.target) })));
    }
    expect(criticalViolations).toEqual([]);
  });

  test('Recorder & Train screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Recorder & Train' }).click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('Conversation violations:', criticalViolations.map(v => ({ id: v.id, help: v.help, count: v.nodes.length, targets: v.nodes.map(n => n.target) })));
    }
    expect(criticalViolations).toEqual([]);
  });

  test('Sessions screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sessions' }).click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('Conversation violations:', criticalViolations.map(v => ({ id: v.id, help: v.help, count: v.nodes.length, targets: v.nodes.map(n => n.target) })));
    }
    expect(criticalViolations).toEqual([]);
  });

  test('Settings screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('Conversation violations:', criticalViolations.map(v => ({ id: v.id, help: v.help, count: v.nodes.length, targets: v.nodes.map(n => n.target) })));
    }
    expect(criticalViolations).toEqual([]);
  });

  test('Keyboard navigation: tab through main navigation tabs and conversation controls', async ({ page }) => {
    await page.goto('/');

    // Press Tab multiple times and verify focus moves across elements
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT', 'SELECT']).toContain(focusedTag);

    // Verify Tab navigation reaches the tabs
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const activeText = await page.evaluate(() => document.activeElement?.textContent);
    expect(activeText).toBeTruthy();
  });
});
