/**
 * Study session. Flow for each card:
 *   question (front face) → "Show answer" → 3D flip → answer (back face)
 *   → rating button → Collection.answer() → next card from the queue.
 * The queue is recomputed from the collection after every answer, so
 * learning cards come back automatically when due.
 * Web: Space = show answer / Good, 1–4 = ratings, Z = undo.
 */
import { formatInterval, selectAnswerPreview, selectCardFaces, selectStudyQueue, type Rating } from '@itera/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, interpolate, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';

import { CountChips } from '@/components/CountChips';
import { GlassButton } from '@/components/GlassButton';
import { GlassSurface } from '@/components/GlassSurface';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { t } from '@/i18n/fr';
import { notify } from '@/platform/dialog';
import { successFeedback } from '@/platform/haptics';
import { useCollection, useCollectionState } from '@/state/CollectionProvider';
import { errorMessage } from '@/state/errors';
import { useNow } from '@/state/useNow';
import { useTheme } from '@/theme/useTheme';
import { radius, space, type } from '@/theme/tokens';

const RATINGS: { rating: Rating; label: string; key: 'again' | 'hard' | 'good' | 'easy' }[] = [
  { rating: 1, label: t.study.again, key: 'again' },
  { rating: 2, label: t.study.hard, key: 'hard' },
  { rating: 3, label: t.study.good, key: 'good' },
  { rating: 4, label: t.study.easy, key: 'easy' },
];

export default function StudyScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const collection = useCollection();
  const state = useCollectionState();
  const [now, refreshNow] = useNow(15_000);
  // Incremented after every answer/undo so that the same (learning) card
  // shown twice in a row still counts as a new "turn" (flip reset, timer).
  const [turn, setTurn] = useState(0);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shownAt = useRef(0);
  const flip = useSharedValue(0);

  const deck = state.decks.get(id);
  const queue = useMemo(() => (deck ? selectStudyQueue(state, deck.id, now) : null), [state, deck, now]);
  const card = queue?.cards[0];
  const cardKey = card ? `${card.id}:${turn}` : null;
  const revealed = cardKey !== null && revealedKey === cardKey;
  const faces = useMemo(() => (card ? selectCardFaces(state, card.id) : null), [state, card]);
  const preview = useMemo(() => (card && revealed ? selectAnswerPreview(state, card.id, now) : null), [state, card, revealed, now]);

  useEffect(() => {
    shownAt.current = Date.now();
    flip.set(0);
  }, [cardKey, flip]);

  const reveal = useCallback(() => {
    if (!cardKey || revealed) return;
    setRevealedKey(cardKey);
    flip.set(withSpring(1, { damping: 16, stiffness: 140 }));
  }, [cardKey, revealed, flip]);

  const answer = useCallback(
    async (rating: Rating) => {
      if (!card || !revealed || busy) return;
      setBusy(true);
      try {
        await collection.answer(card.id, rating, Date.now() - shownAt.current);
        refreshNow();
        setTurn((n) => n + 1);
      } catch (e) {
        notify(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [card, revealed, busy, collection, refreshNow],
  );

  const undo = useCallback(async () => {
    if (await collection.undoLastAnswer()) {
      refreshNow();
      setTurn((n) => n + 1);
    }
  }, [collection, refreshNow]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (revealed) void answer(3);
        else reveal();
      } else if (['1', '2', '3', '4'].includes(e.key)) void answer(Number(e.key) as Rating);
      else if (e.key.toLowerCase() === 'z') void undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, reveal, revealed, undo]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.get(), [0, 1], [0, 180])}deg` }],
    opacity: flip.get() < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.get(), [0, 1], [-180, 0])}deg` }],
    opacity: flip.get() >= 0.5 ? 1 : 0,
  }));

  if (!deck || !queue) return <Screen back title={t.errors.NOT_FOUND}>{null}</Screen>;

  const header = (
    <View style={styles.headerRight}>
      <CountChips counts={queue.counts} />
      <GlassButton icon="undo" onPress={undo} disabled={!collection.canUndo()} accessibilityLabel={t.study.undo} />
    </View>
  );

  if (!card || !faces) {
    return (
      <Screen back right={header}>
        <Animated.View entering={ZoomIn.springify()} style={styles.doneWrap}>
          <GlassSurface style={styles.done}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={[type.largeTitle, { color: theme.text }]}>{t.study.doneTitle}</Text>
            <Text style={[type.body, { color: theme.textSecondary, textAlign: 'center' }]}>{t.study.doneBody}</Text>
            <GlassButton
              label={t.study.backToDeck}
              variant="primary"
              onPress={() => {
                successFeedback();
                router.back();
              }}
            />
          </GlassSurface>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen
      back
      right={header}
      scroll={false}
      footer={
        revealed && preview ? (
          <Animated.View entering={FadeInUp.duration(260)} style={styles.ratings}>
            {RATINGS.map((r) => (
              <GlassButton
                key={r.rating}
                label={r.label}
                sublabel={formatInterval(now, preview[r.rating])}
                color={theme.rating[r.key]}
                onPress={() => answer(r.rating)}
                disabled={busy}
                style={styles.flex}
              />
            ))}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(200)}>
            <GlassButton label={t.study.showAnswer} variant="primary" size="lg" onPress={reveal} />
          </Animated.View>
        )
      }>
      <PressableScale style={styles.cardArea} onPress={reveal} pressedScale={0.985} haptic={!revealed} accessibilityLabel={t.study.showAnswer}>
        <Animated.View style={[styles.face, frontStyle]} pointerEvents={revealed ? 'none' : 'auto'}>
          <GlassSurface radius={radius.xl} style={styles.faceInner}>
            <CardText text={faces.question} color={theme.text} />
          </GlassSurface>
        </Animated.View>
        <Animated.View style={[styles.face, backStyle]} pointerEvents={revealed ? 'auto' : 'none'}>
          <GlassSurface radius={radius.xl} style={styles.faceInner}>
            <CardText text={faces.question} color={theme.textSecondary} small />
            <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
            <CardText text={faces.answer} color={theme.text} />
          </GlassSurface>
        </Animated.View>
      </PressableScale>
      {Platform.OS === 'web' ? <Text style={[type.caption, { color: theme.textTertiary, textAlign: 'center' }]}>{t.study.shortcuts}</Text> : null}
    </Screen>
  );
}

/** Card content is always rendered as plain text — never HTML — so imported content cannot inject markup or scripts. */
function CardText({ text, color, small }: { text: string; color: string; small?: boolean }) {
  return (
    <ScrollView contentContainerStyle={styles.cardTextWrap} style={small ? styles.smallText : styles.flex}>
      <Text selectable style={[small ? type.headline : type.card, { color, textAlign: 'center' }]}>
        {text}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardArea: { flex: 1, minHeight: 320 },
  face: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backfaceVisibility: 'hidden' },
  faceInner: { flex: 1, padding: space.xl },
  cardTextWrap: { flexGrow: 1, justifyContent: 'center' },
  smallText: { maxHeight: '35%', flexGrow: 0 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: space.lg },
  ratings: { flexDirection: 'row', gap: space.sm },
  doneWrap: { marginTop: space.xxl },
  done: { padding: space.xxl, alignItems: 'center', gap: space.lg },
  doneEmoji: { fontSize: 56 },
});
