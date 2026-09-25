// End-to-end smoke test of the web build, run under the production CSP.
// Covers: create deck → add cards → study with keyboard → persistence after
// reload → no plaintext in IndexedDB → JSON export → erase everything.
//
// Usage (from apps/app):  npm run build:web && npm run test:e2e:web
// Env: E2E_SCREENSHOTS=<dir> to save screenshots; PW_CHROMIUM=<path> to use a
// specific Chromium binary.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = 'http://localhost:8082';
const shots = process.env.E2E_SCREENSHOTS;
const server = spawn(process.execPath, [new URL('./serve-web.mjs', import.meta.url).pathname], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
try {
  for (const colorScheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 420, height: 880 }, colorScheme });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('dialog', (d) => d.accept());
    const shot = async (name) => shots && (await page.waitForTimeout(700), await page.screenshot({ path: `${shots}/${name}-${colorScheme}.png` }));

    await page.goto(`${BASE}/`);
    await page.getByText('Nouveau paquet').click();
    await page.getByPlaceholder('Nom du paquet').fill('Japonais N5');
    await page.getByText('Créer', { exact: true }).click();
    await page.getByText('Ajouter une carte').click();
    for (const [front, back] of [['猫', 'chat'], ['犬', 'chien'], ['水', 'eau']]) {
      await page.getByPlaceholder('Question').fill(front);
      await page.getByPlaceholder('Réponse').fill(back);
      await page.getByText('Enregistrer').click();
      await page.waitForFunction(() => document.querySelector('textarea[placeholder="Question"]')?.value === '');
    }
    await page.goBack();
    await page.getByText('Étudier', { exact: true }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByText('Afficher la réponse').first().waitFor();
      await page.waitForTimeout(250);
      if (i === 0) await shot('question');
      await page.keyboard.press('Space');
      await page.getByText('Facile').waitFor();
      if (i === 0) await shot('answer');
      await page.keyboard.press('4');
    }
    await page.getByText('Bravo !').waitFor();

    await page.goto(`${BASE}/`);
    await page.getByText('Japonais N5').waitFor();
    await page.getByText('3 révisions aujourd\'hui', { exact: false }).waitFor();
    await shot('home');

    const db = await page.evaluate(async () => {
      const idb = await new Promise((r) => {
        const q = indexedDB.open('itera-data');
        q.onsuccess = () => r(q.result);
      });
      const values = await new Promise((r) => {
        const q = idb.transaction('records').objectStore('records').getAll();
        q.onsuccess = () => r(q.result);
      });
      const bytes = values.map((v) => new TextDecoder('latin1').decode(new Uint8Array(v))).join('');
      return { count: values.length, leak: /chat|chien|eau|Japonais|deck|card|review/.test(bytes) };
    });
    assert.equal(db.count, 10, '1 deck + 3 notes + 3 cards + 3 reviews');
    assert.equal(db.leak, false, 'IndexedDB must only contain ciphertext');

    await page.getByLabel('Réglages').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByText('Exporter (JSON lisible)').click()]);
    const chunks = await (await download.createReadStream()).toArray();
    const exported = JSON.parse(Buffer.concat(chunks).toString());
    assert.equal(exported.format, 'itera.export');
    assert.deepEqual([exported.decks.length, exported.notes.length, exported.cards.length, exported.reviews.length], [1, 3, 3, 3]);

    await page.getByText('Effacer toutes mes données').click();
    await page.locator('input').last().fill('EFFACER');
    await page.getByText('Supprimer', { exact: true }).click();
    await page.getByText('Aucun paquet pour le moment').waitFor();

    assert.deepEqual(errors, [], 'no console errors / CSP violations');
    await page.close();
    console.log(`✓ web e2e (${colorScheme})`);
  }
} finally {
  await browser.close();
  server.kill();
}
