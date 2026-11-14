import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('image conversion preserves the file locally and downloads a JPEG', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.method() !== 'GET' || new URL(request.url()).origin !== 'http://127.0.0.1:4173') requests.push(request.url());
  });
  await page.goto('/');
  await page.getByLabel('Choose files', { exact: true }).setInputFiles('tests/fixtures/sample.png');
  await expect(page.locator('.file-icon img')).toHaveAttribute('src', /^blob:/);
  await page.getByLabel('Width').fill('32');
  await page.getByRole('button', { name: 'Start processing' }).click();
  await expect(page.locator('.status.done')).toHaveCount(1);
  await expect(page.locator('.output')).toContainText('32 × 16');
  const download = page.waitForEvent('download');
  await page.locator('.output').getByRole('button', { name: 'Download' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('sample-optimized.jpg');
  const data = await readFile((await file.path())!);
  expect([...data.subarray(0, 3)]).toEqual([255, 216, 255]);
  expect(requests).toEqual([]);
});

test('PDF shows a clear page count and exports selected pages', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose files', { exact: true }).setInputFiles('tests/fixtures/sample.pdf');
  await expect(page.locator('.file-info')).toContainText('Total pages: 3');
  await expect(page.getByPlaceholder('Leave blank for all pages; or enter 3 or 3-5')).toHaveValue('');
  await page.getByLabel('Output format').selectOption('image/png');
  await page.getByPlaceholder('Leave blank for all pages; or enter 3 or 3-5').fill('1,3');
  await page.getByRole('button', { name: 'Start processing' }).click();
  await expect(page.locator('.status.done')).toHaveCount(1);
  await page.locator('summary').click();
  await expect(page.locator('.output')).toHaveCount(2);
  await expect(page.locator('.output').first()).toContainText('p001.png');
  await expect(page.locator('.output').last()).toContainText('p003.png');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download selected as ZIP' }).click();
  const data = await readFile((await (await download).path())!);
  expect(data.readUInt32LE(0)).toBe(0x04034b50);
});

test('language changes keep the queue and clear it on refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose files', { exact: true }).setInputFiles('tests/fixtures/sample.png');
  await page.getByRole('button', { name: '简体中文' }).click();
  await expect(page.locator('.file-card')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.reload();
  await expect(page.locator('.file-card')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});

test('mobile layout does not overflow and privacy dialog closes', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Privacy' }).click();
  await expect(page.locator('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close preview' }).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  if (test.info().project.name === 'mobile') {
    await page.getByLabel('Choose files', { exact: true }).setInputFiles('tests/fixtures/sample.png');
    const settings = await page.locator('.settings').boundingBox();
    const queue = await page.locator('.files-panel').boundingBox();
    expect(settings && queue && settings.y < queue.y).toBeTruthy();
    await page.getByRole('button', { name: 'Start processing' }).click();
    await expect(page.locator('.status.done')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
