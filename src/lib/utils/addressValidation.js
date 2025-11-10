import bs58check from 'bs58check';
import { address, networks } from 'flokicoinjs-lib';

const FLC_NETWORK = networks.bitcoin;
const LEGACY_PREFIXES = new Set([FLC_NETWORK.pubKeyHash, FLC_NETWORK.scriptHash]);

function legacyOrInvalidMessage(value) {
  try {
    const { version } = address.fromBase58Check(value);
    if (LEGACY_PREFIXES.has(version)) {
      return 'Legacy Flokicoin addresses (starting with F or 3) are not supported.';
    }
  } catch (legacyError) {
    // Ignore decoding errors; treat as invalid below.
  }
  return 'Enter a valid Flokicoin address.';
}

export function getFlcAddressError(value, options = {}) {
  const { allowEmpty = true } = options;
  const trimmed = `${value ?? ''}`.trim();
  if (!trimmed) {
    return allowEmpty ? '' : 'Enter your Flokicoin wallet address.';
  }
  try {
    const decoded = address.fromBech32(trimmed);
    if (decoded.prefix !== FLC_NETWORK.bech32) {
      return 'Use a mainnet Flokicoin address (fc...).';
    }
    return '';
  } catch (error) {
    return legacyOrInvalidMessage(trimmed);
  }
}

export function getBase58AddressError(value, options = {}) {
  const { allowEmpty = true, label = 'address' } = options;
  const trimmed = `${value ?? ''}`.trim();
  if (!trimmed) {
    return allowEmpty ? '' : `Enter a ${label}.`;
  }
  try {
    bs58check.decode(trimmed);
    return '';
  } catch (error) {
    return `Enter a valid ${label}.`;
  }
}
