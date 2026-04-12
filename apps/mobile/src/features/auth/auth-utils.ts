import * as Crypto from 'expo-crypto';
import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { ed25519 } from '@noble/curves/ed25519.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function bytesToBase32(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32ToBytes(input: string) {
  const normalized = input.replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Uint8Array.from(output);
}

export function dynamicTruncate(bytes: Uint8Array) {
  const offset = bytes[bytes.length - 1] & 0x0f;
  const binary =
    ((bytes[offset] & 0x7f) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff);

  return binary;
}

export function generateHotp(secretBase32: string, counter: number, digits = 6) {
  const secret = base32ToBytes(secretBase32);
  const counterBytes = new Uint8Array(8);
  let tempCounter = counter;

  for (let index = 7; index >= 0; index -= 1) {
    counterBytes[index] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }

  const digest = hmac(sha1, secret, counterBytes);
  const binary = dynamicTruncate(digest);
  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

export function generateTotp(secretBase32: string, timestamp = Date.now(), periodSeconds = 30) {
  const counter = Math.floor(timestamp / 1000 / periodSeconds);
  const code = generateHotp(secretBase32, counter);
  const remainingSeconds = periodSeconds - (Math.floor(timestamp / 1000) % periodSeconds);

  return {
    code,
    counter,
    expiresAt: timestamp + remainingSeconds * 1000,
    periodSeconds,
    remainingSeconds,
  };
}

export async function sha256Hex(value: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

export function generateSecretBase32(byteCount = 20) {
  return bytesToBase32(Crypto.getRandomBytes(byteCount));
}

export function createDeviceId() {
  return Crypto.randomUUID();
}

export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

export function createDeviceKeyPair() {
  const secretKey = ed25519.utils.randomSecretKey(Crypto.getRandomBytes(32));
  const publicKey = ed25519.getPublicKey(secretKey);

  return {
    privateKeyHex: bytesToHex(secretKey),
    publicKeyHex: bytesToHex(publicKey),
  };
}

export function publicKeyFingerprint(publicKeyHex: string) {
  return `${publicKeyHex.slice(0, 8)}...${publicKeyHex.slice(-8)}`;
}
