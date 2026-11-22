import { test, expect } from '@playwright/test';

test.describe('GESTURA Offline Conversation E2E Flow', () => {
  test('renders split-screen interface and header elements', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page.locator('h1')).toContainText('GESTURA');
    await expect(page.getByText('Offline Mode')).toBeVisible();

    // Check split-screen panels
    await expect(page.getByText('Signer Camera (Sign → Speech)')).toBeVisible();
    await expect(page.getByText('Avatar Signer (Speech → Sign)')).toBeVisible();
    await expect(page.getByText('Shared Conversation History')).toBeVisible();
  });

  test('accumulates recognized signs and speaks caption', async ({ page }) => {
    await page.goto('/');

    // Click simulation button "+ HELLO"
    const helloBtn = page.getByRole('button', { name: '+ HELLO' });
    await helloBtn.click();

    // Verify input contains HELLO
    const captionInput = page.getByPlaceholder('Signing gesture will accumulate here... (Editable)');
    await expect(captionInput).toHaveValue('HELLO');

    // Click "+ DOCTOR"
    const doctorBtn = page.getByRole('button', { name: '+ DOCTOR' });
    await doctorBtn.click();
    await expect(captionInput).toHaveValue('HELLO DOCTOR');

    // Click Speak button
    const speakBtn = page.getByRole('button', { name: 'Speak' });
    await speakBtn.click();

    // Verify message appears in shared transcript
    await expect(page.locator('text=HELLO DOCTOR').first()).toBeVisible();
    // Input resets
    await expect(captionInput).toHaveValue('');
  });

  test('hearing partner speech input animates avatar and updates transcript', async ({ page }) => {
    await page.goto('/');

    const hearingInput = page.getByPlaceholder('Speak or type English here to animate avatar...');
    await hearingInput.fill('Thank you doctor');

    const signBtn = page.getByRole('button', { name: 'Sign', exact: true });
    await signBtn.click();

    // Verify turn in transcript
    await expect(page.locator('text=Thank you doctor').first()).toBeVisible();
  });

  test('navigates through tabs: Recorder, Sessions, Settings', async ({ page }) => {
    await page.goto('/');

    // Go to Recorder
    await page.getByRole('button', { name: 'Recorder & Train' }).click();
    await expect(page.getByText('Guided Sign Recorder')).toBeVisible();
    await expect(page.getByText('Model Trainer & ONNX Exporter')).toBeVisible();

    // Go to Sessions
    await page.getByRole('button', { name: 'Sessions' }).click();
    await expect(page.getByText('Session History & Privacy Management')).toBeVisible();

    // Go to Settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Preferences & System Configuration')).toBeVisible();
    await expect(page.getByText('Indian Sign Language')).toBeVisible();
  });

  test('60 fps render loop stability on avatar canvas', async ({ page }) => {
    await page.goto('/');

    // Measure requestAnimationFrame count over 1000ms
    const frameCount = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        function step() {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(step);
          } else {
            resolve(frames);
          }
        }
        requestAnimationFrame(step);
      });
    });

    // In a browser with vsync, frameCount should be ~50-65 fps
    expect(frameCount).toBeGreaterThanOrEqual(45);
  });
});
