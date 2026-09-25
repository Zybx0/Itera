/** Deck overview: today's counts, study button, statistics and the list of notes. */
import { selectCardsOfDeck, selectNotesOfDeck, selectStats, selectStudyQueue } from '@itera/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CountChips } from '@/components/CountChips';
import { GlassButton } from '@/components/GlassButton';
import { GlassSurface } from '@/components/GlassSurface';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { t } from '@/i18n/fr';
import { useCollectionState } from '@/state/CollectionProvider';
import { useNow } from '@/state/useNow';
import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

const MAX_LISTED = 200;

export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const state = useCollectionState();
  const [now] = useNow();
  const deck = state.decks.get(id);

  const data = useMemo(() => {
    if (!deck) return null;
    const suspendedNotes = new Set<string>();
    const activeNotes = new Set<string>();
    for (const card of selectCardsOfDeck(state, deck.id)) (card.suspended ? suspendedNotes : activeNotes).add(card.noteId);
    return {
      queue: selectStudyQueue(state, deck.id, now),
      stats: selectStats(state, deck.id, now),
      notes: selectNotesOfDeck(state, deck.id),
      isSuspended: (noteId: string) => suspendedNotes.has(noteId) && !activeNotes.has(noteId),
    };
  }, [deck, state, now]);

  if (!deck || !data) {
    return (
      <Screen back title={t.errors.NOT_FOUND}>
        {null}
      </Screen>
    );
  }
  const { queue, stats, notes, isSuspended } = data;
  const canStudy = queue.cards.length > 0;

  return (
    <Screen
      back
      title={deck.name}
      {...(deck.description ? { subtitle: deck.description } : {})}
      right={<GlassButton icon="sliders" onPress={() => router.push({ pathname: '/deck/[id]/settings', params: { id } })} accessibilityLabel={t.deck.settings} />}>
      <Animated.View entering={FadeInDown.delay(60).duration(380)}>
        <GlassSurface style={styles.hero}>
          <CountChips counts={queue.counts} labels large />
          <GlassButton
            label={canStudy ? t.deck.study : t.deck.nothingToStudy}
            variant="primary"
            size="lg"
            disabled={!canStudy}
            onPress={() => router.push({ pathname: '/study/[id]', params: { id } })}
          />
        </GlassSurface>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.stats}>
        <Stat value={String(stats.total)} label={t.deck.total} />
        <Stat value={stats.retention30d === null ? '—' : `${Math.round(stats.retention30d * 100)} %`} label={t.deck.retention} />
        <Stat value={String(stats.streakDays)} label={t.deck.streak} />
      </Animated.View>

      <GlassButton label={t.deck.addCard} icon="add" onPress={() => router.push({ pathname: '/note/edit', params: { deckId: id } })} />

      <Section title={`${t.deck.cards} (${notes.length})`} delay={180}>
        {notes.length === 0 ? <Text style={[type.body, { color: theme.textSecondary }]}>{t.deck.noCards}</Text> : null}
        {notes.slice(0, MAX_LISTED).map((note) => {
          const suspended = isSuspended(note.id);
          return (
            <PressableScale key={note.id} onPress={() => router.push({ pathname: '/note/edit', params: { noteId: note.id } })} pressedScale={0.98}>
              <View style={[styles.note, { borderBottomColor: theme.glassBorder }]}>
                <Text style={[type.body, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                  {note.front}
                </Text>
                <Text style={[type.callout, { color: suspended ? theme.danger : theme.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {suspended ? t.deck.suspended : note.back}
                </Text>
              </View>
            </PressableScale>
          );
        })}
        {notes.length > MAX_LISTED ? <Text style={[type.caption, { color: theme.textTertiary }]}>… +{notes.length - MAX_LISTED}</Text> : null}
      </Section>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <GlassSurface variant="clear" style={styles.stat}>
      <Text style={[type.title, { color: theme.text, fontVariant: ['tabular-nums'] }]}>{value}</Text>
      <Text style={[type.caption, { color: theme.textSecondary }]}>{label}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.xl, gap: space.xl },
  stats: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space.lg, gap: 2 },
  note: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
