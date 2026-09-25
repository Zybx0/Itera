/** Deck settings: name, description, daily limits, FSRS desired retention, deletion. */
import { DEFAULT_DECK_CONFIG } from '@itera/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassButton } from '@/components/GlassButton';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TextField } from '@/components/TextField';
import { t } from '@/i18n/fr';
import { confirm, notify } from '@/platform/dialog';
import { useCollection, useCollectionState } from '@/state/CollectionProvider';
import { errorMessage } from '@/state/errors';
import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

const RETENTION_STEPS = [0.8, 0.85, 0.9, 0.93, 0.95, 0.97];

function toInt(text: string, fallback: number): number {
  const n = Number.parseInt(text.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function DeckSettingsScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const collection = useCollection();
  const deck = useCollectionState().decks.get(id);
  const [name, setName] = useState(deck?.name ?? '');
  const [description, setDescription] = useState(deck?.description ?? '');
  const [newPerDay, setNewPerDay] = useState(String(deck?.config.newPerDay ?? DEFAULT_DECK_CONFIG.newPerDay));
  const [reviewsPerDay, setReviewsPerDay] = useState(String(deck?.config.reviewsPerDay ?? DEFAULT_DECK_CONFIG.reviewsPerDay));
  const [retention, setRetention] = useState(deck?.config.desiredRetention ?? DEFAULT_DECK_CONFIG.desiredRetention);

  if (!deck) return <Screen back title={t.errors.NOT_FOUND}>{null}</Screen>;

  const save = async () => {
    try {
      await collection.updateDeck(id, {
        name,
        description,
        config: {
          newPerDay: toInt(newPerDay, deck.config.newPerDay),
          reviewsPerDay: toInt(reviewsPerDay, deck.config.reviewsPerDay),
          desiredRetention: retention,
        },
      });
      router.back();
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const remove = async () => {
    if (!(await confirm(t.deckSettings.deleteConfirm(deck.name), t.common.delete, true))) return;
    try {
      await collection.deleteDeck(id);
      router.dismissTo('/');
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  return (
    <Screen back title={t.deckSettings.title}>
      <Section>
        <TextField label={t.deckSettings.name} value={name} onChangeText={setName} maxLength={120} />
        <TextField label={t.deckSettings.description} value={description} onChangeText={setDescription} multiline maxLength={2000} />
      </Section>
      <Section delay={60}>
        <TextField label={t.deckSettings.newPerDay} value={newPerDay} onChangeText={setNewPerDay} keyboardType="number-pad" maxLength={4} />
        <TextField label={t.deckSettings.reviewsPerDay} value={reviewsPerDay} onChangeText={setReviewsPerDay} keyboardType="number-pad" maxLength={5} />
        <Text style={[type.caption, { color: theme.textSecondary }]}>{t.deckSettings.retention}</Text>
        <View style={styles.steps}>
          {RETENTION_STEPS.map((r) => (
            <GlassButton key={r} label={`${Math.round(r * 100)} %`} variant={r === retention ? 'primary' : 'glass'} onPress={() => setRetention(r)} />
          ))}
        </View>
        <Text style={[type.caption, { color: theme.textTertiary }]}>{t.deckSettings.retentionHelp}</Text>
      </Section>
      <GlassButton label={t.common.save} variant="primary" size="lg" onPress={save} disabled={!name.trim()} />
      <GlassButton label={t.deckSettings.deleteDeck} variant="danger" onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
