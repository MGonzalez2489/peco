import { EntryCategory } from '@domain/entities';
import { MainLayout } from '@presentation/layout';
import { EntryStackParams } from '@presentation/navigation';
import { StackScreenProps } from '@react-navigation/stack';
import { useCatalogsStore } from '@store/useCatalogsStore';
import { COLORS } from '@styles/colors';
import { ChevronRight, TriangleAlert } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = StackScreenProps<EntryStackParams, 'SelectEntryCategory'>;

// --- COMPONENTE DE ITEM DE CATEGORÍA REUSABLE ---
interface CategoryItemProps {
  category: EntryCategory;
  onSelect: (category: EntryCategory) => void;
  onDrillDown: (category: EntryCategory) => void;
  isSelected: boolean;
}

// eslint-disable-next-line react/display-name
const CategoryItem = React.memo(
  ({ category, onSelect, onDrillDown, isSelected }: CategoryItemProps) => {
    // Un item es navegable si tiene subcategorías
    const isDrillable = category.subCategories && category.subCategories.length > 0;

    const handlePress = () => {
      if (isDrillable) {
        // Si es navegable, llama a onDrillDown
        onDrillDown(category);
      } else {
        // Si no es navegable (categoría final), llama a onSelect
        onSelect(category);
      }
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[styles.itemContainer, isSelected && styles.selectedItem]}
      >
        <View style={styles.leftContent}>
          <View style={[styles.iconWrapper, { backgroundColor: category.color || COLORS.primary }]}>
            <TriangleAlert />
          </View>
          <View>
            <Text style={styles.categoryName}>{category.name}</Text>
          </View>
          <View style={styles.rightContent}>
            <ChevronRight />
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

// --- COMPONENTE PRINCIPAL CON LÓGICA DRILL-DOWN (CORREGIDO) ---
export const SelEntryCategoryModal = ({ route, navigation }: Props) => {
  const { groupedEntryCategories } = useCatalogsStore(); // La lista a renderizar es la que viene de los parámetros, o las categorías principales por defecto
  // Filtramos las categorías que tienen padre (asumiendo que los padres se filtran por !cat.parent)

  const currentList =
    route.params?.categoryList || groupedEntryCategories.filter((cat) => !cat.parent); // Usamos el ID para la comparación

  const [selectedCategory, setSelectedCategory] = useState<EntryCategory | undefined>(
    route.params?.selectedCategory
  ); // 1. Maneja la selección final (cierra el modal)

  const handleSelection = (value: EntryCategory) => {
    setSelectedCategory(value);
    const onSelect = route.params?.onSelect;
    if (onSelect) {
      onSelect(value);
    }
    navigation.popTo('CreateEntryForm');
  }; // 2. Maneja el "Drill-Down" (navega a la sub-lista)

  const handleDrillDown = (parentCategory: EntryCategory) => {
    navigation.push('SelectEntryCategory', {
      onSelect: route.params?.onSelect, // Mantenemos el callback original
      selectedCategory: selectedCategory, // Mantenemos la selección
      title: parentCategory.name, // Usamos el nombre del padre como título
      categoryList: parentCategory.subCategories,
    });
  }; // El título se basa en si estamos viendo la lista principal o una sub-lista

  const screenTitle = route.params?.title || 'Selecciona una Categoría';

  return (
    <MainLayout title={screenTitle}>
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.publicId}
        renderItem={({ item }) => (
          <CategoryItem
            category={item}
            onSelect={handleSelection}
            onDrillDown={handleDrillDown}
            isSelected={selectedCategory?.publicId === item.publicId}
          />
        )}
        ListFooterComponent={<View style={{ height: 30 }} />}
      />
    </MainLayout>
  );
};

// --- ESTILOS (Sin cambios) ---
const styles = StyleSheet.create({
  // ... (Tus estilos se mantienen igual)
  itemContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: COLORS.white,
  },
  selectedItem: {
    backgroundColor: '#E6F0FF',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconWrapper: {
    width: 36, // Más grande
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary || '#333',
    textTransform: 'capitalize',
    flexShrink: 1, // Para evitar que el texto se salga
  },
  parentNameText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary || '#A0A0A0',
    textTransform: 'capitalize',
    marginTop: 2,
  },
});
