import { relayInit } from 'nostr-tools';

export const MERGE_MINING_RELAY_URL = 'wss://sharenote.ohstr.com';
export const MERGE_MINING_KIND = 30001;
export const MERGE_MINING_TIMEOUT_MS = 6000;
export const MERGE_MINING_COINS = [
  { id: 'doge', label: 'DOGE', icon: 'doge' },
  { id: 'bells', label: 'BELLS', icon: 'bells' },
  { id: 'pep', label: 'PEP', icon: 'pep' },
];

export const MERGE_MINING_COINS_MAP = MERGE_MINING_COINS.reduce((map, coin) => {
  map[coin.id] = coin;
  return map;
}, {});

let mergeMiningRelay;
let mergeMiningRelayPromise;

export async function ensureMergeMiningRelay() {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    throw new Error('Merge mining relay unavailable.');
  }

  if (mergeMiningRelay?.status === WebSocket.OPEN) {
    return mergeMiningRelay;
  }

  if (mergeMiningRelayPromise) {
    await mergeMiningRelayPromise;
    if (mergeMiningRelay?.status === WebSocket.OPEN) {
      return mergeMiningRelay;
    }
  }

  mergeMiningRelay = relayInit(MERGE_MINING_RELAY_URL);
  mergeMiningRelayPromise = (async () => {
    await mergeMiningRelay.connect();
    return mergeMiningRelay;
  })()
    .catch((error) => {
      mergeMiningRelay = undefined;
      throw error;
    })
    .finally(() => {
      mergeMiningRelayPromise = null;
    });

  return await mergeMiningRelayPromise;
}

export function closeMergeMiningRelay() {
  if (mergeMiningRelay?.status === WebSocket.OPEN) {
    mergeMiningRelay.close();
  }
  mergeMiningRelay = undefined;
  mergeMiningRelayPromise = null;
}

export async function fetchMergeMiningEvent(address) {
  const relay = await ensureMergeMiningRelay();

  return await new Promise((resolve) => {
    let settled = false;
    let receivedEvent = null;
    let timeout;
    let sub;
    const events = [];

    const cleanup = () => {
      if (settled) {
        return;
      }
      settled = true;
      sub?.unsub();
      if (timeout) {
        clearTimeout(timeout);
      }
    };

    const done = () => {
      cleanup();
      const latestEvent = events.reduce(
        (best, event) =>
          !best || (event?.created_at ?? 0) > (best?.created_at ?? 0) ? event : best,
        null
      );
      resolve(latestEvent);
    };

    const filter = {
      kinds: [MERGE_MINING_KIND],
      '#a': [address],
      limit: 1,
    };

    sub = relay.sub([filter]);
    sub.on('event', (event) => {
      events.push(event);
    });
    sub.on('eose', done);
    timeout = setTimeout(done, MERGE_MINING_TIMEOUT_MS);
  });
}

export function parseMergeMiningTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  const parsed = [];
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length < 2) {
      continue;
    }
    const key = `${tag[0]}`.toLowerCase();
    if (key === 'a') {
      continue;
    }
    const addressValue = tag[1];
    if (!addressValue) {
      continue;
    }
    const metadata = MERGE_MINING_COINS_MAP[key];
    parsed.push({
      coinId: key,
      label: metadata?.label ?? key.toUpperCase(),
      icon: metadata?.icon,
      address: addressValue,
      signature: tag[2] ?? '',
    });
  }
  return parsed;
}
