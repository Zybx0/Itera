/**
 * Create (params: deckId) or edit (params: noteId) a note.
 * In creation mode the form is cleared after saving so cards can be added
 * in a row, like Anki's "Add" window.
 */
import { LIMITS, selectCardsOfNote, type NoteType } from '@itera/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { GlassButton } from '@/components/GlassButton';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/TextField';
import { t } from '@/i18n/fr';
import { confirm, notify } from '@/platform/dialog';
import { successFeedback } from '@/platform/haptics';
import { useCollection, useCollectionState } from '@/state/CollectionProvider';
import { errorMessage } from '@/state/errors';
import { useTheme } from '@/theme/useTheme';
import { space, type } from '@/theme/tokens';

export default function NoteEditScreen() {
  const params = useLocalSearchParams<{ deckId?: string; noteId?: string }>();
  const theme = useTheme();
  const collection = useCollection();
  const state = useCollectionState();
  const existing = params.noteId ? state.notes.get(params.noteId) : undefined;
  const deckId = existing?.deckId ?? params.deckId ?? '';

  const [front, setFront] = useState(existing?.front ?? '');
  const [back, setBack] = useState(existing?.back ?? '');
  const [tags, setTags] = useState(existing?.tags.join(', ') ?? '');
  const [noteType, setNoteType] = useState<NoteType>(existing?.noteType ?? 'basic');
  const [flash, setFlash] = useState(false);

  const cards = existing ? selectCardsOfNote(state, existing.id) : [];
  const suspended = cards.length > 0 && cards.every((c) => c.suspended);

  const save = async () => {
    const input = { deckId, noteType, front, back, tags: tags.split(',') };
    try {
      if (existing) {
        await collection.updateNote(existing.id, input);
        router.back();
      } else {
        await collection.addNote(input);
        successFeedback();
        setFront('');
        setBack('');
        setFlash(true);
        setTimeout(() => setFlash(false), 1400);
      }
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const remove = async () => {
    if (!existing || !(await confirm(t.note.deleteConfirm, t.common.delete, true))) return;
    await collection.deleteNote(existing.id);
    router.back();
  };

  const toggleSuspend = async () => {
    for (const card of cards) await collection.setSuspended(card.id, !suspended);
  };

  return (
    <Screen back title={existing ? t.note.editTitle : t.note.newTitle}>
      <Section>
        <Segmented
          value={noteType}
          onChange={setNoteType}
          options={[
            { value: 'basic', label: t.note.typeBasic },
            { value: 'basic-reversed', label: t.note.typeReversed },
          ]}
        />
        <TextField label={t.note.front} placeholder={t.note.frontPlaceholder} value={front} onChangeText={setFront} multiline autoFocus={!existing} maxLength={LIMITS.fieldLength} />
        <TextField label={t.note.back} placeholder={t.note.backPlaceholder} value={back} onChangeText={setBack} multiline maxLength={LIMITS.fieldLength} />
        <TextField label={t.note.tags} placeholder={t.note.tagsPlaceholder} value={tags} onChangeText={setTags} autoCapitalize="none" />
      </Section>

      <View style={styles.flashSlot}>
        {flash ? (
          <Animated.Text entering={FadeIn} exiting={FadeOut} style={[type.callout, { color: theme.rating.good, textAlign: 'center' }]}>
            {t.note.added}
          </Animated.Text>
        ) : null}
      </View>

      <GlassButton label={t.common.save} variant="primary" size="lg" onPress={save} disabled={!front.trim() || (noteType === 'basic-reversed' && !back.trim())} />
      {existing ? (
        <View style={styles.row}>
          <GlassButton label={suspended ? t.note.unsuspend : t.note.suspend} onPress={toggleSuspend} style={styles.flex} />
          <GlassButton label={t.common.delete} variant="danger" onPress={remove} style={styles.flex} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  flashSlot: { minHeight: 20 },
});
