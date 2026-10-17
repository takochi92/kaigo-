// Publish the already generated sns-auto package through Meta's Instagram API.
// The workflow is deliberately inert until IG_AUTOPUBLISH_ENABLED is set.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const root = path.resolve('sns-auto');
const day = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const packageDir = path.join(root, day);
const ledgerFile = path.join(packageDir, 'instagram-published.json');
const tokenFile = path.join(root, 'instagram-token.enc.json');
const api = 'https://graph.instagram.com/v26.0';
const userId = process.env.IG_USER_ID;
const initialToken = process.env.IG_ACCESS_TOKEN;
const keyText = process.env.IG_TOKEN_ENCRYPTION_KEY;
const enabled = process.env.IG_AUTOPUBLISH_ENABLED === 'true';
const dryRun = process.argv.includes('--dry-run');
const firstMetaDay = '2026-10-18';
const jstDate = (value) => new Date(new Date(value).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

function gitSave(file, message) {
  execFileSync('git', ['-C', root, 'add', path.relative(root, file)], { stdio: 'pipe' });
  const changed = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
  if (!changed) return;
  execFileSync('git', ['-C', root, 'commit', '-m', message], { stdio: 'pipe' });
  execFileSync('git', ['-C', root, 'push', 'origin', 'HEAD:sns-auto'], { stdio: 'pipe' });
}

function writeLedger(state, extra = {}) {
  fs.writeFileSync(ledgerFile, JSON.stringify({ date: day, state, updatedAt: new Date().toISOString(), ...extra }, null, 2) + '\n');
  gitSave(ledgerFile, `Instagram ${day}: ${state}`);
}

function encryptionKey() {
  if (!keyText || keyText.length < 32) throw new Error('IG_TOKEN_ENCRYPTION_KEY is missing or too short');
  return createHash('sha256').update(keyText).digest();
}

function decryptToken() {
  if (!fs.existsSync(tokenFile)) return initialToken;
  const data = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(data.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data.value, 'base64')), decipher.final()]).toString('utf8');
}

function saveToken(token, expiresIn) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const value = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  fs.writeFileSync(tokenFile, JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), value: value.toString('base64'), refreshedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() }) + '\n');
  gitSave(tokenFile, 'Refresh encrypted Instagram token');
}

async function graph(endpoint, token, { method = 'GET', body } = {}) {
  const response = await fetch(`${api}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(`Instagram API HTTP ${response.status}, code ${data.error?.code ?? 'unknown'}`);
  return data;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (text) => String(text || '').replace(/\r\n/g, '\n').trim();

async function findPublished(token, caption) {
  const response = await graph(`/${userId}/media?fields=id,caption,permalink,timestamp&limit=30`, token);
  return response.data?.find((item) => item.timestamp && jstDate(item.timestamp) === day && normalize(item.caption) === normalize(caption));
}

async function maybeRefreshToken(token) {
  const saved = fs.existsSync(tokenFile) ? JSON.parse(fs.readFileSync(tokenFile, 'utf8')) : null;
  if (saved?.refreshedAt && Date.now() - Date.parse(saved.refreshedAt) < 7 * 86400_000) return token;
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', token);
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  const data = await response.json().catch(() => ({}));
  if (response.ok && data.access_token && data.expires_in) {
    saveToken(data.access_token, data.expires_in);
    return data.access_token;
  }
  // A freshly issued token cannot be refreshed for its first 24 hours.
  if (!saved) { console.log('Initial token refresh deferred; retry on next run'); return token; }
  throw new Error(`Instagram token refresh failed (HTTP ${response.status})`);
}

async function ready(containerId, token) {
  for (let n = 0; n < 5; n++) {
    const result = await graph(`/${containerId}?fields=status_code`, token);
    if (result.status_code === 'FINISHED') return;
    if (['ERROR', 'EXPIRED'].includes(result.status_code)) throw new Error(`Instagram container ${result.status_code}`);
    await sleep(15_000);
  }
  throw new Error('Instagram container not ready after five checks');
}

async function main() {
  if (!dryRun && day < firstMetaDay) { console.log(`Meta publishing starts on ${firstMetaDay} JST`); return; }
  if (!enabled && !dryRun) { console.log('Instagram publishing is disabled'); return; }
  if (!fs.existsSync(path.join(packageDir, 'post.json'))) {
    if (dryRun || new Date(Date.now() + 9 * 3600_000).getUTCHours() < 10) {
      console.log(`Package for ${day} is not ready`);
      return;
    }
    throw new Error(`Package for ${day} is missing after 10:00 JST`);
  }
  const post = JSON.parse(fs.readFileSync(path.join(packageDir, 'post.json'), 'utf8'));
  if (post.date !== day || !post.caption?.trim() || !['article', 'terms', 'manga'].includes(post.kind) || !Array.isArray(post.images) || post.images.length < 1 || post.images.length > 10) throw new Error('Invalid post package');
  for (const image of post.images) {
    if (!/^\d{2}\.jpg$/.test(image) || !fs.existsSync(path.join(packageDir, image))) throw new Error(`Missing image ${image}`);
  }
  if (dryRun) {
    console.log(`Validated ${day}: ${post.kind}, ${post.images.length} images`);
    // 読み取りだけでトークンと投稿先を確かめる（投稿・トークン更新はしない）
    if (!userId || !initialToken) { console.log('Token check skipped: IG_USER_ID / IG_ACCESS_TOKEN not set'); return; }
    if (keyText.length < 32) console.log('Warning: IG_TOKEN_ENCRYPTION_KEY is missing or shorter than 32 characters');
    const account = await graph('/me?fields=id,username', decryptToken());
    const ok = account.id === userId && account.username?.toLowerCase() === 'oyanote';
    console.log(ok ? 'Token check: OK (@oyanote)' : `Token check: account mismatch (id match: ${account.id === userId}, username: ${account.username})`);
    if (!ok) process.exitCode = 1;
    return;
  }
  if (!userId || !initialToken) throw new Error('Instagram account secrets are missing');
  const token = await maybeRefreshToken(decryptToken());
  const account = await graph('/me?fields=id,username', token);
  if (account.id !== userId || account.username?.toLowerCase() !== 'oyanote') throw new Error('Instagram account does not match @oyanote');

  const previous = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) : null;
  if (previous?.state === 'published') {
    if (!previous.mediaId) throw new Error('Published ledger lacks media ID');
    const media = await graph(`/${previous.mediaId}?fields=id,permalink`, token);
    if (media.id !== previous.mediaId) throw new Error('Published media could not be verified');
    console.log(`Already published: ${media.permalink}`);
    return;
  }
  const published = await findPublished(token, post.caption);
  if (published) { writeLedger('published', { mediaId: published.id, permalink: published.permalink, recovered: true }); console.log('Found existing post'); return; }
  if (previous?.state === 'publishing' || previous?.state === 'uncertain') throw new Error('Previous publish attempt is uncertain; manual review required');
  if (new Date(Date.now() + 9 * 3600_000).getUTCHours() < 10) { console.log('Waiting for 10:00 JST'); return; }

  const imageUrls = post.images.map((name) => `https://raw.githubusercontent.com/takochi92/kaigo-/sns-auto/${day}/${name}`);
  for (const url of imageUrls) {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20_000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/jpeg')) throw new Error('Public image is unavailable');
  }
  let containerId;
  if (imageUrls.length === 1) {
    containerId = (await graph(`/${userId}/media`, token, { method: 'POST', body: { image_url: imageUrls[0], caption: post.caption } })).id;
  } else {
    const children = [];
    for (const image_url of imageUrls) {
      const child = await graph(`/${userId}/media`, token, { method: 'POST', body: { image_url, is_carousel_item: true } });
      children.push(child.id);
    }
    containerId = (await graph(`/${userId}/media`, token, { method: 'POST', body: { media_type: 'CAROUSEL', children: children.join(','), caption: post.caption } })).id;
  }
  await ready(containerId, token);
  // Persist this guard before the irreversible publish request. A retry never sends a second publish blindly.
  writeLedger('publishing', { containerId });
  try {
    const result = await graph(`/${userId}/media_publish`, token, { method: 'POST', body: { creation_id: containerId } });
    writeLedger('published', { mediaId: result.id });
    console.log(`Instagram accepted publish for ${day}: media ${result.id}`);
  } catch (error) {
    writeLedger('uncertain', { containerId });
    throw error;
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
