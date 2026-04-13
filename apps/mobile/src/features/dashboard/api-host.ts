import AsyncStorage from '@react-native-async-storage/async-storage';

const API_HOST_OVERRIDE_KEY = 'huntrix.settings.api-host-override';

export function getFallbackApiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (value && value.length > 0) {
    return normalizeApiBaseUrl(value);
  }

  if (
    typeof globalThis !== 'undefined' &&
    'location' in globalThis &&
    globalThis.location &&
    typeof globalThis.location.hostname === 'string'
  ) {
    return `http://${globalThis.location.hostname}:8080`;
  }

  return 'http://127.0.0.1:8080';
}

export async function getCurrentApiBaseUrl(): Promise<string> {
  const override = await readApiHostOverride();
  return override ?? getFallbackApiBaseUrl();
}

export async function readApiHostOverride(): Promise<string | null> {
  const value = await AsyncStorage.getItem(API_HOST_OVERRIDE_KEY);
  return value ? normalizeApiBaseUrl(value) : null;
}

export async function writeApiHostOverride(value: string): Promise<string> {
  const normalized = normalizeApiBaseUrl(value);
  await AsyncStorage.setItem(API_HOST_OVERRIDE_KEY, normalized);
  return normalized;
}

export async function clearApiHostOverride(): Promise<void> {
  await AsyncStorage.removeItem(API_HOST_OVERRIDE_KEY);
}

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return getFallbackApiBaseUrl();
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withProtocol.replace(/\/$/, '');
}

export async function checkApiHealth(baseUrl: string): Promise<{ ok: boolean; status: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${normalizeApiBaseUrl(baseUrl)}/healthz`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`health request failed: ${response.status}`);
    }

    const payload = (await response.json()) as { status?: string };
    return {
      ok: payload.status === 'ok',
      status: payload.status ?? 'unknown',
    };
  } finally {
    clearTimeout(timeout);
  }
}
