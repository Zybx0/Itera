import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius, space, type } from '@/theme/tokens';

import { GlassSurface } from './GlassSurface';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  help?: string;
  minHeight?: number;
}

export function TextField({ label, help, minHeight, multiline, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[type.caption, styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
      <GlassSurface radius={radius.md} variant="clear" style={focused ? { borderColor: theme.accent, borderWidth: 1.5 } : null}>
        <TextInput
          placeholderTextColor={theme.textTertiary}
          selectionColor={theme.accent}
          autoCorrect={false}
          {...rest}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[type.body, styles.input, { color: theme.text, minHeight: minHeight ?? (multiline ? 96 : 48) }, multiline && styles.multiline]}
        />
      </GlassSurface>
      {help ? <Text style={[type.caption, styles.label, { color: theme.textTertiary }]}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: { marginLeft: space.sm },
  input: { paddingHorizontal: space.lg, paddingVertical: space.md, outlineStyle: 'none' } as object,
  multiline: { textAlignVertical: 'top' },
});
