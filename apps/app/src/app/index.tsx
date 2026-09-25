/** Home: list of decks with today's counts, quick deck creation. */
import { selectDecks, selectStats, selectStudyQueue } from '@itera/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { CountChips } from '@/components/CountChips';
import { GlassButton } from '@/components/GlassButton';
import { GlassSurface } from '@/components/GlassSurface';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { t } from '@/i18n/fr';
import { notify } from '@/platform/dialog';
import { useCollection, useCollectionState, useCollectionStatus } from '@/state/CollectionProvider';
import { errorMessage } from '@/state/errors';
import { useNow } from '@/state/useNow';
import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

export default function HomeScreen() {
  const theme = useTheme();
  const collection = useCollection();
  const state = useCollectionState();
  const status = useCollectionStatus();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const [now] = useNow();
  const decks = useMemo(() => selectDecks(state).map((deck) => ({ deck, counts: selectStudyQueue(state, deck.id, now).counts })), [state, now]);
  const stats = useMemo(() => selectStats(state, undefined, now), [state, now]);
  const corrupt = status.kind === 'ready' ? status.report.corrupt.length : 0;

  const create = async () => {
    try {
      const deck = await collection.createDeck({ name });
      setName('');
      setCreating(false);
      router.push({ pathname: '/deck', params: { id: deck.id } });
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  return (
    <Screen
      title={t.appName}
      subtitle={t.home.subtitle(stats.reviewedToday, stats.streakDays)}
      right={
        <GlassButton icon="settings" onPress={() => router.push('/settings')} accessibilityLabel={t.settings.title} />
      }>
      {corrupt > 0 ? <Text style={[type.caption, { color: theme.danger }]}>{t.home.corrupt(corrupt)}</Text> : null}

      {decks.length === 0 && !creating ? (
        <Animated.View entering={FadeInDown.delay(80)}>
          <GlassSurface style={styles.empty}>
            <Icon name="sparkles" size={34} color={theme.accent} />
            <Text style={[type.title, { color: theme.text, textAlign: 'center' }]}>{t.home.emptyTitle}</Text>
            <Text style={[type.body, { color: theme.textSecondary, textAlign: 'center' }]}>{t.home.emptyBody}</Text>
          </GlassSurface>
        </Animated.View>
      ) : null}

      {decks.map(({ deck, counts }, i) => (
        <Animated.View key={deck.id} entering={FadeInDown.delay(60 * i).duration(380)} layout={LinearTransition}>
          <PressableScale onPress={() => router.push({ pathname: '/deck', params: { id: deck.id } })} accessibilityLabel={deck.name}>
            <GlassSurface style={styles.deck} interactive>
              <View style={styles.deckText}>
                <Text style={[type.headline, { color: theme.text }]} numberOfLines={1}>
                  {deck.name}
                </Text>
                {deck.description ? (
                  <Text style={[type.caption, { color: theme.textSecondary }]} numberOfLines={1}>
                    {deck.description}
                  </Text>
                ) : null}
              </View>
              <CountChips counts={counts} />
              <Icon name="chevron" size={16} color={theme.textTertiary} />
            </GlassSurface>
          </PressableScale>
        </Animated.View>
      ))}

      {creating ? (
        <Animated.View entering={FadeInDown} style={styles.create}>
          <TextField value={name} onChangeText={setName} placeholder={t.home.deckNamePlaceholder} autoFocus onSubmitEditing={create} returnKeyType="done" maxLength={120} />
          <View style={styles.actions}>
            <GlassButton label={t.common.cancel} onPress={() => setCreating(false)} style={styles.flex} />
            <GlassButton label={t.home.create} variant="primary" onPress={create} disabled={!name.trim()} style={styles.flex} />
          </View>
        </Animated.View>
      ) : (
        <GlassButton label={t.home.newDeck} icon="add" onPress={() => setCreating(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { padding: space.xl, gap: space.md, alignItems: 'center' },
  deck: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg, paddingHorizontal: space.lg },
  deckText: { flex: 1, gap: 2 },
  create: { gap: space.md },
  actions: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
