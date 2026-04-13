import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';

import { ActionChip } from '@/src/components/ui/action-chip';
import { SectionCard } from '@/src/components/ui/section-card';
import {
  checkApiHealth,
  clearApiHostOverride,
  getCurrentApiBaseUrl,
  getFallbackApiBaseUrl,
  normalizeApiBaseUrl,
  readApiHostOverride,
  writeApiHostOverride,
} from '@/src/features/dashboard/api-host';
import { palette } from '@/src/theme/palette';

export default function SettingsModal() {
  const [draftHost, setDraftHost] = useState('');
  const [currentHost, setCurrentHost] = useState('');
  const [savedOverride, setSavedOverride] = useState<string | null>(null);
  const [status, setStatus] = useState('Load, test, and override the backend host without restarting the app.');
  const [isBusy, setIsBusy] = useState(false);
  const fallbackHost = getFallbackApiBaseUrl();

  useEffect(() => {
    let active = true;

    Promise.all([getCurrentApiBaseUrl(), readApiHostOverride()]).then(([nextHost, nextOverride]) => {
      if (!active) {
        return;
      }
      setCurrentHost(nextHost);
      setSavedOverride(nextOverride);
      setDraftHost(nextOverride ?? nextHost);
    });

    return () => {
      active = false;
    };
  }, []);

  async function saveHost() {
    await withBusy(async () => {
      const normalized = await writeApiHostOverride(draftHost);
      setSavedOverride(normalized);
      setCurrentHost(normalized);
      setDraftHost(normalized);
      setStatus(`Saved API host override: ${normalized}`);
    });
  }

  async function useDefaultHost() {
    await withBusy(async () => {
      await clearApiHostOverride();
      const fallback = getFallbackApiBaseUrl();
      setSavedOverride(null);
      setCurrentHost(fallback);
      setDraftHost(fallback);
      setStatus(`Reverted to fallback API host: ${fallback}`);
    });
  }

  async function runHealthCheck() {
    await withBusy(async () => {
      const normalized = normalizeApiBaseUrl(draftHost);
      const result = await checkApiHealth(normalized);
      setStatus(
        result.ok
          ? `Health check passed for ${normalized}`
          : `Health check returned unexpected status for ${normalized}: ${result.status}`,
      );
      if (result.ok) {
        setCurrentHost(normalized);
      }
    });
  }

  async function withBusy(run: () => Promise<void>) {
    setIsBusy(true);
    try {
      await run();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Settings action failed.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: palette.canvas }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            gap: 16,
            padding: 20,
            paddingBottom: 64,
          }}
          style={{ flex: 1, backgroundColor: palette.canvas }}
        >
          <SectionCard
            eyebrow="Settings"
            title="Backend host"
            description="Use the env value as the fallback, then override it here when your laptop IP changes during the demo."
          >
            <View style={{ gap: 12 }}>
              <Field label="Current API host" value={currentHost || 'Loading…'} />
              <Field label="Saved override" value={savedOverride ?? 'None'} />
              <Field label="Fallback from env" value={fallbackHost} />
            </View>
          </SectionCard>

          <SectionCard
            eyebrow="Edit Host"
            title="Override backend address"
            description="You can enter a full URL or just host:port. The app reads this setting at request time, so you do not need to rebuild."
          >
            <View style={{ gap: 12 }}>
              <Text selectable style={{ color: palette.textPrimary, fontWeight: '700' }}>
                API host input
              </Text>
              <TextInput
                accessibilityLabel="API host input"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setDraftHost}
                placeholder="http://192.168.68.102:8080"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
                style={{
                  minHeight: 52,
                  borderRadius: 18,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: palette.borderStrong,
                  backgroundColor: palette.shell,
                  color: palette.textPrimary,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
                value={draftHost}
              />

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <ActionChip
                  label={isBusy ? 'Working…' : 'Save Host'}
                  onPress={saveHost}
                  tone="primary"
                  accessibilityHint="Save the current API host override."
                />
                <ActionChip
                  label={isBusy ? 'Working…' : 'Health Check'}
                  onPress={runHealthCheck}
                  accessibilityHint="Call the backend health endpoint using the typed host."
                />
                <ActionChip
                  label={isBusy ? 'Working…' : 'Use Default'}
                  onPress={useDefaultHost}
                  tone="danger"
                  accessibilityHint="Clear the override and go back to the env fallback host."
                />
              </View>

              <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                {status}
              </Text>
            </View>
          </SectionCard>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text selectable style={{ color: palette.textMuted, fontWeight: '700' }}>
        {label}
      </Text>
      <Text selectable style={{ color: palette.textPrimary, lineHeight: 22 }}>
        {value}
      </Text>
    </View>
  );
}
