import * as Crypto from 'expo-crypto';
import { AES } from '@stablelib/aes';
import { GCM } from '@stablelib/gcm';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';

import { bytesToHex, hexToBytes, sha256Hex } from '@/src/features/auth/auth-utils';

type EncryptedMeshPayload = {
  ciphertextHex: string;
  nonceHex: string;
  payloadHashHex: string;
};

export async function encryptMeshPayload(
  plaintext: string,
  senderPrivateKeyHex: string,
  recipientPublicKeyHex: string,
) {
  const key = deriveSharedKey(senderPrivateKeyHex, recipientPublicKeyHex);
  const nonce = Crypto.getRandomBytes(12);
  const aes = new AES(key);
  const gcm = new GCM(aes);
  const sealed = gcm.seal(nonce, new TextEncoder().encode(plaintext));
  gcm.clean();
  aes.clean();

  return {
    ciphertextHex: bytesToHex(sealed),
    nonceHex: bytesToHex(nonce),
    payloadHashHex: await sha256Hex(plaintext),
  } satisfies EncryptedMeshPayload;
}

export function decryptMeshPayload(
  encrypted: EncryptedMeshPayload,
  recipientPrivateKeyHex: string,
  senderPublicKeyHex: string,
) {
  const key = deriveSharedKey(recipientPrivateKeyHex, senderPublicKeyHex);
  const aes = new AES(key);
  const gcm = new GCM(aes);
  const opened = gcm.open(
    hexToBytes(encrypted.nonceHex),
    hexToBytes(encrypted.ciphertextHex),
  );
  gcm.clean();
  aes.clean();

  if (!opened) {
    return null;
  }

  return new TextDecoder().decode(opened);
}

function deriveSharedKey(privateKeyHex: string, publicKeyHex: string) {
  const montgomerySecret = ed25519.utils.toMontgomerySecret(hexToBytes(privateKeyHex));
  const montgomeryPublic = ed25519.utils.toMontgomery(hexToBytes(publicKeyHex));
  const shared = x25519.getSharedSecret(montgomerySecret, montgomeryPublic);
  return shared.slice(0, 32);
}
