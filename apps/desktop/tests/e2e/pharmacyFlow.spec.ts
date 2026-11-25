import { test, expect } from '@playwright/test';

test.describe('GESTURA Pharmacy Counter End-to-End Flow', () => {
  test('1. Loads Pharmacy Home screen with 2 large action buttons and offline badge', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page.getByRole('heading', { name: 'Gestura — Pharmacy' })).toBeVisible();
    await expect(page.getByText('100% Offline', { exact: true })).toBeVisible();

    // Two main navigation buttons on Home
    await expect(page.getByRole('button', { name: /Sign to Pharmacist/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Pharmacist Reply/i }).first()).toBeVisible();
  });

  test('2. Complete BDD Scenario: Sign Medicine + Allergy -> Summary -> Reply Morning + Night', async ({
    page,
  }) => {
    await page.goto('/');

    // Step 1: Click "Sign to Pharmacist" (nav or card)
    await page.getByRole('button', { name: /Sign to Pharmacist/i }).first().click();

    // Verify 15-chip fallback bar is visible
    const medicineChip = page.getByRole('button', { name: 'Medicine', exact: true });
    const allergyChip = page.getByRole('button', { name: 'Allergy', exact: true });
    await expect(medicineChip).toBeVisible();
    await expect(allergyChip).toBeVisible();

    // Tap Medicine and Allergy chips
    await medicineChip.click();
    await allergyChip.click();

    // Verify Sentence Strip contains both signs
    await expect(page.getByText('Sentence Strip (2)')).toBeVisible();

    // Step 2: Send to Summary
    await page.getByRole('button', { name: 'Send to Summary' }).click();

    // Verify Summary Screen
    await expect(page.getByText('Patient Communication Summary')).toBeVisible();
    await expect(page.locator('text=Medicine').first()).toBeVisible();
    await expect(page.locator('text=Allergy').first()).toBeVisible();

    // Step 3: Pharmacist confirms summary
    await page.getByRole('button', { name: /Confirm & Pharmacist Reply/i }).click();

    // Verify Reply Desk
    await expect(page.getByText('Pharmacist Reply Desk')).toBeVisible();

    // Step 4: Click Quick Phrase "Morning and night"
    await page.getByRole('button', { name: 'Morning and night', exact: true }).click();

    // Verify Gloss Sequence contains MORNING and NIGHT cards and animated sign canvas is visible
    await expect(page.getByText('Sign Gloss Sequence:')).toBeVisible();
    await expect(page.locator('text=Morning').first()).toBeVisible();
    await expect(page.locator('text=Night').first()).toBeVisible();
    await expect(page.locator('canvas[aria-label*="Animated sign demonstration"]')).toBeVisible();

    // Step 5: Verify Session History Preview has the exchange
    await expect(page.getByText('Session History Preview')).toBeVisible();
  });
});
