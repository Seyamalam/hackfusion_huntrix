import { Pressable, ScrollView, Text, View } from 'react-native';

import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import { AuthLogCard } from '@/src/features/auth/components/auth-log-card';
import { OtpCard } from '@/src/features/auth/components/otp-card';
import { useAuthDemo } from '@/src/features/auth/use-auth-demo';
import { palette } from '@/src/theme/palette';

export default function AuthScreen() {
  const auth = useAuthDemo();

  if (auth.loading || !auth.state || !auth.snapshot) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20 }}
        style={{ flex: 1, backgroundColor: palette.canvas }}
      >
        <SectionCard
          eyebrow="Auth"
          title="Initializing offline identity"
          description="Loading secure seed material and auth audit chain."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 16,
        padding: 20,
      }}
      style={{ flex: 1, backgroundColor: palette.canvas }}
    >
      <SectionCard
        eyebrow="Module 1"
        title="Offline auth and audit chain"
        description="This screen demonstrates offline TOTP/HOTP generation, device key provisioning, named RBAC roles, and tamper-evident login logs."
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <StatusPill label={auth.state.role.replaceAll('_', ' ')} tone="info" />
          <StatusPill label={auth.compromised ? 'Tampered' : 'Audit Intact'} tone={auth.compromised ? 'alert' : 'success'} />
          <StatusPill label={`Device ${auth.state.deviceId.slice(0, 8)}`} tone="neutral" />
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Key Pair"
        title="Per-device Ed25519 identity"
        description="The public key is suitable for shared-ledger registration. The private key is kept in secure local storage with a web fallback for development."
      >
        <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
          Public key fingerprint: {auth.state.devicePublicKeyHex.slice(0, 12)}...
          {auth.state.devicePublicKeyHex.slice(-12)}
        </Text>
      </SectionCard>

      <OtpCard
        title="Offline TOTP"
        code={auth.snapshot.code}
        detail={`Expires in ${auth.snapshot.remainingSeconds}s and auto-regenerates every ${auth.snapshot.periodSeconds}s.`}
        actionLabel="Rotate Secret"
        onPress={auth.rotateOtpSecret}
      />

      <OtpCard
        title="Offline HOTP"
        code={auth.hotpCode ?? '------'}
        detail={`Counter-based code generated from the same locally stored secret. Counter advances only when requested.`}
        actionLabel="Generate HOTP"
        onPress={auth.generateHotpCode}
      />

      <SectionCard
        eyebrow="RBAC"
        title="Named role assignment"
        description="The restored statement requires exact named roles. This controls the active auth context for the demo."
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {auth.availableRoles.map((role) => (
            <Pressable
              key={role}
              onPress={() => auth.selectRole(role)}
              style={{
                borderRadius: 999,
                backgroundColor: auth.state?.role === role ? '#f7d7cf' : palette.surfaceStrong,
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>
                {role.replaceAll('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Login Demo"
        title="OTP verification and tamper checks"
        description="Use these controls to append login events, inject a corrupted log entry, and verify the audit chain detects it."
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <ActionButton label="Valid Login" onPress={auth.runValidLogin} />
          <ActionButton label="Invalid Login" onPress={auth.runInvalidLogin} />
          <ActionButton label="Tamper Log" onPress={auth.tamperChain} />
          <ActionButton label="Verify Chain" onPress={auth.verifyChain} />
        </View>
        <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
          {auth.loginStatus ?? 'No auth action executed yet.'}
        </Text>
      </SectionCard>

      <SectionCard
        eyebrow="Audit Trail"
        title="Hash-chained auth events"
        description="Latest events are shown first. Each entry includes a previous hash and its own hash fragment for quick inspection."
      >
        <AuthLogCard entries={[...auth.state.auditLog].reverse().slice(0, 6)} />
      </SectionCard>
    </ScrollView>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
};

function ActionButton({ label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: palette.surfaceStrong,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
