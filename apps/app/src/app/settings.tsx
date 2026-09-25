/**
 * Settings — security and GDPR rights:
 *  - app lock (native),
 *  - export (plain JSON or passphrase-encrypted) = rights of access & portability,
 *  - import (merge / replace),
 *  - erase everything = right to erasure.
 */
import { decryptExport, encryptExport, isEncryptedExport, MIN_PASSPHRASE_LENGTH, parseExport, serializeExport } from '@itera/core';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { GlassButton } from '@/components/GlassButton';
import { Row, Section } from '@/components/Section';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { t } from '@/i18n/fr';
import { appLockSupported, authenticate, canUseAppLock, isAppLockEnabled, setAppLockEnabled } from '@/platform/appLock';
import { choose, notify } from '@/platform/dialog';
import { pickTextFile, saveTextFile } from '@/platform/files';
import { useCollection, useEraseEverything } from '@/state/CollectionProvider';
import { errorMessage } from '@/state/errors';
import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

type PassphraseMode = { kind: 'export' } | { kind: 'import'; text: string } | null;

function exportFileName(encrypted: boolean): string {
  const date = new Date().toISOString().slice(0, 10);
  return `itera-${encrypted ? 'sauvegarde-chiffree' : 'export'}-${date}.json`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const collection = useCollection();
  const eraseEverything = useEraseEverything();
  const [lockAvailable, setLockAvailable] = useState(false);
  const [lockOn, setLockOn] = useState(false);
  const [passMode, setPassMode] = useState<PassphraseMode>(null);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [eraseText, setEraseText] = useState('');
  const [showErase, setShowErase] = useState(false);

  useEffect(() => {
    if (!appLockSupported) return;
    void canUseAppLock().then(setLockAvailable);
    void isAppLockEnabled().then(setLockOn);
  }, []);

  const toggleLock = async (value: boolean) => {
    if (!(await authenticate(t.lock.reason))) return;
    await setAppLockEnabled(value);
    setLockOn(value);
  };

  const run = async (task: () => Promise<void>) => {
    try {
      await task();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setProgress(null);
    }
  };

  const exportPlain = () => run(() => saveTextFile(exportFileName(false), serializeExport(collection.exportBundle())));

  const importFile = () =>
    run(async () => {
      const text = await pickTextFile();
      if (text === null) return;
      if (isEncryptedExport(text)) {
        setPassMode({ kind: 'import', text });
        return;
      }
      await applyImport(parseExport(text));
    });

  const applyImport = async (bundle: ReturnType<typeof parseExport>) => {
    const mode = await choose(t.settings.importModeQuestion, [t.settings.importMerge, t.settings.importReplace]);
    if (mode === null) return;
    const { written } = await collection.importBundle(bundle, mode === 0 ? 'merge' : 'replace');
    notify(t.settings.importDone(written));
  };

  const submitPassphrase = () =>
    run(async () => {
      if (!passMode) return;
      setProgress(0);
      if (passMode.kind === 'export') {
        if (pass !== pass2) throw new Error(t.settings.passphraseMismatch);
        const text = await encryptExport(collection.exportBundle(), pass, { onProgress: setProgress });
        await saveTextFile(exportFileName(true), text);
      } else {
        const bundle = await decryptExport(passMode.text, pass, setProgress);
        setProgress(null);
        await applyImport(bundle);
      }
      setPassMode(null);
      setPass('');
      setPass2('');
    });

  const erase = () =>
    run(async () => {
      await eraseEverything();
      setShowErase(false);
      setEraseText('');
      notify(t.settings.erased);
      router.dismissTo('/');
    });

  return (
    <Screen back title={t.settings.title}>
      <Section title={t.settings.security}>
        {appLockSupported ? (
          <Row>
            <View style={styles.flex}>
              <Text style={[type.body, { color: theme.text }]}>{t.settings.appLock}</Text>
              <Text style={[type.caption, { color: theme.textSecondary }]}>{t.settings.appLockHelp}</Text>
            </View>
            <Switch value={lockOn} onValueChange={toggleLock} disabled={!lockAvailable} trackColor={{ true: theme.accent }} />
          </Row>
        ) : null}
        <Text style={[type.caption, { color: theme.textSecondary }]}>{t.settings.encryptionInfo}</Text>
      </Section>

      <Section title={t.settings.data} delay={60}>
        <GlassButton label={t.settings.exportPlain} onPress={exportPlain} />
        <GlassButton label={t.settings.exportEncrypted} onPress={() => setPassMode({ kind: 'export' })} />
        <GlassButton label={t.settings.importData} onPress={importFile} />

        {passMode ? (
          <View style={styles.block}>
            <TextField label={t.settings.passphrase} value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" textContentType="password" help={t.settings.passphraseHelp(MIN_PASSPHRASE_LENGTH)} />
            {passMode.kind === 'export' ? (
              <TextField label={t.settings.passphraseConfirm} value={pass2} onChangeText={setPass2} secureTextEntry autoCapitalize="none" textContentType="password" />
            ) : null}
            {progress !== null ? (
              <View style={[styles.progressTrack, { backgroundColor: theme.glassFill }]}>
                <View style={[styles.progressBar, { backgroundColor: theme.accent, width: `${Math.round(progress * 100)}%` }]} />
              </View>
            ) : null}
            <Row>
              <GlassButton label={t.common.cancel} onPress={() => setPassMode(null)} style={styles.flex} />
              <GlassButton label={t.common.confirm} variant="primary" onPress={submitPassphrase} loading={progress !== null} disabled={pass.length < MIN_PASSPHRASE_LENGTH} style={styles.flex} />
            </Row>
          </View>
        ) : null}

        <View style={[styles.separator, { backgroundColor: theme.glassBorder }]} />
        <Text style={[type.caption, { color: theme.textSecondary }]}>{t.settings.eraseHelp}</Text>
        {showErase ? (
          <View style={styles.block}>
            <TextField label={t.settings.eraseConfirm} value={eraseText} onChangeText={setEraseText} autoCapitalize="characters" />
            <Row>
              <GlassButton label={t.common.cancel} onPress={() => setShowErase(false)} style={styles.flex} />
              <GlassButton label={t.common.delete} variant="danger" onPress={erase} disabled={eraseText.trim() !== t.settings.eraseWord} style={styles.flex} />
            </Row>
          </View>
        ) : (
          <GlassButton label={t.settings.eraseAll} variant="danger" onPress={() => setShowErase(true)} />
        )}
      </Section>

      <Section title={t.settings.about} delay={120}>
        <Text style={[type.body, { color: theme.text }]}>{t.settings.noTracking}</Text>
        <GlassButton label={t.settings.privacy} onPress={() => router.push('/privacy')} />
        <Text style={[type.caption, { color: theme.textTertiary }]}>
          {t.settings.version} {Constants.expoConfig?.version ?? '—'}
        </Text>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: space.md },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: space.xs },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: 6, borderRadius: 3 },
});
