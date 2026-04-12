import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ActionChip } from '@/src/components/ui/action-chip';
import { AnimatedPanel } from '@/src/components/ui/animated-panel';
import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import { usePodDemo } from '@/src/features/pod/use-pod-demo';
import { palette } from '@/src/theme/palette';

type CameraPermissionState = { granted?: boolean } | null;

let cameraModule:
  | {
      CameraView: React.ComponentType<{
        barcodeScannerSettings?: { barcodeTypes: string[] };
        onBarcodeScanned?: ((event: { data: string }) => void) | undefined;
        style?: { flex: number };
      }>;
      useCameraPermissions: () => [
        CameraPermissionState,
        () => Promise<{ granted: boolean }>,
      ];
    }
  | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cameraModule = require('expo-camera');
} catch {
  cameraModule = null;
}

export function PodDemoPanel() {
  const pod = usePodDemo();
  const [permissions, requestPermission] =
    cameraModule?.useCameraPermissions?.() ?? [null, async () => ({ granted: false })];
  const [scanLocked, setScanLocked] = useState(false);
  const CameraView = cameraModule?.CameraView ?? null;

  async function handleOpenScanner() {
    if (!CameraView) {
      pod.setScannerOpen(false);
      return;
    }

    if (!permissions?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        return;
      }
    }

    pod.setScannerOpen(true);
  }

  return (
    <>
      <AnimatedPanel index={7}>
        <SectionCard
          eyebrow="Module 5"
          title="Zero-trust proof of delivery"
          description="The driver signs a QR challenge offline, the camp countersigns it offline, and the final receipt is added to the ledger with replay protection."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatusPill label={pod.currentRole ?? 'unknown role'} tone="neutral" />
            <StatusPill label={`Nonces ${pod.usedNonces.length}`} tone="warning" />
            <StatusPill label={`Receipts ${pod.receipts.length}`} tone="info" />
            <StatusPill label={pod.errorCode ?? 'POD_OK'} tone={pod.errorCode && pod.errorCode !== 'POD_OK' ? 'alert' : 'success'} />
          </View>
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
            {pod.status}
          </Text>
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={8}>
        <SectionCard
          eyebrow="Draft"
          title="Prepare the offline handoff packet"
          description="Keep the same delivery ID to build a chain of custody across multiple handoffs."
        >
          <View style={{ gap: 12 }}>
            <Field label="Delivery ID" value={pod.deliveryId} onChangeText={pod.setDeliveryId} />
            <Field label="Payload Summary" value={pod.payloadSummary} onChangeText={pod.setPayloadSummary} multiline />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionChip label="Generate Driver QR" onPress={pod.generateDriverQr} tone="primary" />
            <ActionChip label="Open Scanner" onPress={handleOpenScanner} />
            <ActionChip label="Simulate Recipient Scan" onPress={pod.simulateRecipientScan} />
            <ActionChip label="Simulate Driver Finalize" onPress={pod.simulateDriverFinalize} />
            <ActionChip label="Replay Challenge" onPress={pod.replayLastChallenge} tone="danger" />
            <ActionChip label="Tamper Challenge" onPress={pod.tamperLastChallenge} />
            <ActionChip label="Reset PoD" onPress={pod.resetLedger} />
          </View>
        </SectionCard>
      </AnimatedPanel>

      {pod.scannerOpen ? (
        <AnimatedPanel index={9}>
          <SectionCard
            eyebrow="Scanner"
            title="Scan the QR challenge or response"
            description={
              CameraView
                ? 'Use this with a second device. For one-device testing, the simulate buttons above run the same verification path.'
                : 'Camera module unavailable in this runtime. Use the simulate buttons above or rebuild the dev client with expo-camera.'
            }
          >
            {CameraView ? (
              <View
                style={{
                  overflow: 'hidden',
                  borderRadius: 24,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: palette.border,
                  height: 280,
                }}
              >
                <CameraView
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={
                    scanLocked
                      ? undefined
                      : ({ data }) => {
                          setScanLocked(true);
                          void pod.processScannedValue(data).finally(() => {
                            setTimeout(() => setScanLocked(false), 1200);
                          });
                        }
                  }
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                Scanner unavailable in this build. The PoD protocol can still be demonstrated with the simulation controls.
              </Text>
            )}
            <ActionChip label="Close Scanner" onPress={() => pod.setScannerOpen(false)} />
          </SectionCard>
        </AnimatedPanel>
      ) : null}

      <AnimatedPanel index={10}>
        <SectionCard
          eyebrow="Driver Challenge"
          title="Signed sender QR"
          description="The QR contains delivery ID, sender public key, payload hash, nonce, and timestamp signed by the sender."
        >
          {pod.lastChallengeValue ? (
            <View style={{ gap: 14 }}>
              <View
                style={{
                  alignSelf: 'center',
                  borderRadius: 24,
                  borderCurve: 'continuous',
                  backgroundColor: '#fff',
                  padding: 16,
                }}
              >
                <QRCode value={pod.lastChallengeValue} size={180} />
              </View>
              <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                {truncatePayload(pod.lastChallengeValue)}
              </Text>
            </View>
          ) : (
            <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
              Generate the driver QR first.
            </Text>
          )}
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={11}>
        <SectionCard
          eyebrow="Recipient Response"
          title="Countersigned response QR"
          description="The camp signs the verified challenge and returns a response QR for final driver verification."
        >
          {pod.lastResponseValue ? (
            <View style={{ gap: 14 }}>
              <View
                style={{
                  alignSelf: 'center',
                  borderRadius: 24,
                  borderCurve: 'continuous',
                  backgroundColor: '#fff',
                  padding: 16,
                }}
              >
                <QRCode value={pod.lastResponseValue} size={180} />
              </View>
              <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                {truncatePayload(pod.lastResponseValue)}
              </Text>
            </View>
          ) : (
            <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
              Scan the driver challenge as the recipient to create the response QR.
            </Text>
          )}
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={12}>
        <SectionCard
          eyebrow="Receipt Chain"
          title="Chain of custody ledger"
          description="Receipts are stored locally with predecessor hashes so the full custody history can be reconstructed from the ledger alone."
        >
          <View style={{ gap: 12 }}>
            {pod.receiptChain.length === 0 ? (
              <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                No receipt recorded yet for {pod.deliveryId}.
              </Text>
            ) : (
              pod.receiptChain.map((receipt) => (
                <View
                  key={receipt.receipt_id}
                  style={{
                    gap: 8,
                    borderRadius: 22,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.shell,
                    padding: 14,
                  }}
                >
                  <InfoRow label="Receipt" value={receipt.receipt_id} />
                  <InfoRow label="Prev hash" value={compactHash(receipt.prev_receipt_hash)} />
                  <InfoRow label="Receipt hash" value={compactHash(receipt.receipt_hash)} />
                  <InfoRow label="Sender key" value={compactHash(receipt.sender_pubkey)} />
                  <InfoRow label="Recipient key" value={compactHash(receipt.recipient_pubkey)} />
                </View>
              ))
            )}
          </View>
        </SectionCard>
      </AnimatedPanel>
    </>
  );
}

function Field({
  label,
  multiline = false,
  onChangeText,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: palette.textPrimary, fontWeight: '700' }}>
        {label}
      </Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        style={{
          minHeight: multiline ? 92 : 52,
          borderRadius: 18,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.shell,
          color: palette.textPrimary,
          paddingHorizontal: 14,
          paddingVertical: 12,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        value={value}
      />
    </View>
  );
}

function truncatePayload(value: string) {
  return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}

function compactHash(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}
