/**
 * In-app privacy notice (GDPR art. 12-14). Must stay in sync with
 * docs/RGPD.md and the App Store privacy "nutrition label".
 */
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { useTheme } from '@/theme/useTheme';
import { type } from '@/theme/tokens';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'En bref',
    body: "Itera fonctionne entièrement sur votre appareil. Nous ne collectons, ne recevons et ne vendons aucune donnée. Il n'y a ni compte, ni publicité, ni traceur, ni outil d'analyse.",
  },
  {
    title: 'Données traitées',
    body: "Vos paquets, cartes et votre historique de révision. Ils sont stockés uniquement sur cet appareil, chiffrés (XChaCha20-Poly1305) avec une clé conservée dans le trousseau sécurisé du système.",
  },
  {
    title: 'Finalité et base légale',
    body: "Ces données servent uniquement à faire fonctionner l'application (planification des révisions). Base légale : exécution du service que vous demandez (art. 6.1.b RGPD).",
  },
  {
    title: 'Partage',
    body: "Aucun. Les données ne quittent l'appareil que si vous les exportez vous-même (fichier JSON ou sauvegarde chiffrée par phrase de passe).",
  },
  {
    title: 'Durée de conservation',
    body: "Tant que vous conservez l'application ou jusqu'à ce que vous les effaciez (Réglages → Effacer toutes mes données). Désinstaller l'application supprime aussi les données.",
  },
  {
    title: 'Vos droits',
    body: "Accès et portabilité : Réglages → Exporter. Rectification : modifiez vos cartes. Effacement : Réglages → Effacer toutes mes données. Vous pouvez aussi introduire une réclamation auprès de la CNIL (cnil.fr).",
  },
  {
    title: 'Contact',
    body: "Pour toute question relative à vos données : voir la fiche de l'application sur l'App Store / le site web d'Itera.",
  },
];

export default function PrivacyScreen() {
  const theme = useTheme();
  return (
    <Screen back title="Confidentialité">
      {SECTIONS.map((s, i) => (
        <Section key={s.title} title={s.title} delay={40 * i}>
          <Text style={[type.body, styles.body, { color: theme.text }]}>{s.body}</Text>
        </Section>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { lineHeight: 24 },
});
