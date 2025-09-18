import { MainLayout } from '@presentation/layout';
import { COLORS } from '@styles/colors';
import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  Link,
  Mail,
  RefreshCw,
  Settings,
  Trash2,
  User,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isNew?: boolean;
  action?: () => void;
}

interface SettingSection {
  title: string; // Título de la sección (usado en renderSectionHeader)
  data: SettingItem[]; // Los ítems de la sección (usado en renderItem)
}

// --- Data de la Vista (Formato SectionList) ---

const SETTINGS_DATA: SettingSection[] = [
  {
    title: 'Settings Hub',
    data: [
      { id: '1', label: 'Account', icon: User },
      { id: '2', label: 'Financial', icon: CreditCard },
      { id: '3', label: 'Customization', icon: Settings },
      { id: '4', label: 'Links', icon: Link },
    ],
  },
  {
    title: 'Account Management',
    data: [
      { id: '5', label: 'Account Switching', icon: Users, isNew: true },
      { id: '6', label: 'Delete Account', icon: Trash2 },
    ],
  },
  {
    title: 'Support & FAQs',
    data: [
      { id: '7', label: 'Search FAQ', icon: HelpCircle },
      { id: '8', label: 'Contact Support', icon: Mail },
    ],
  },
  {
    title: 'App',
    data: [{ id: '9', label: 'App Updates', icon: RefreshCw }],
  },
];

// --- Componente de un Ítem ---

const SettingListItem = ({ item }: { item: SettingItem }) => {
  const IconComponent = item.icon;

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={item.action}>
      <View style={styles.itemLeft}>
        <View style={styles.iconWrapper}>
          <IconComponent size={20} color={COLORS.secondaryText} />
        </View>
        <Text style={styles.itemLabel}>{item.label}</Text>
        {item.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
      <ChevronRight size={20} color={COLORS.secondaryText} />
    </TouchableOpacity>
  );
};

// --- Componente Principal con SectionList ---
//TODO: FIX OPTIONS, COMPONENTS
export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();

  const renderSectionHeader = ({ section: { title } }: { section: SettingSection }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <MainLayout title="Configuracion">
      <View>
        <SectionList
          sections={SETTINGS_DATA} // Usamos la data estructurada
          renderItem={({ item }) => <SettingListItem item={item} />}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          // Evita que los encabezados de sección floten (como en la imagen)
          stickySectionHeadersEnabled={false}
          ListFooterComponent={<View style={{ height: insets.bottom + 20 }} />}
        />
      </View>
    </MainLayout>
  );
};

// --- Estilos ---

const styles = StyleSheet.create({
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 20, // Aumentado para separación visual
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondaryText,
    marginTop: 20,
    marginBottom: 5,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
    // Eliminamos el borderBottom si la sección se ve como un bloque unido (como en la imagen)
    // Si quieres separadores, agrégalo de nuevo.
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconWrapper: {
    // Si quieres un círculo alrededor del ícono, usa un estilo aquí
  },
  itemLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  newBadge: {
    marginLeft: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadgeText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
