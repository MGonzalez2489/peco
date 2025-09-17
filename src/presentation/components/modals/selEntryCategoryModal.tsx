import { EntryCategory } from '@domain/entities';
import { MainLayout } from '@presentation/layout';
import { EntryStackParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { useCatalogsStore } from '@store/useCatalogsStore';
import { ChevronRight } from 'lucide-react-native';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

type Props = StackScreenProps<EntryStackParams, 'SelEntryCategory'>;

export const SelEntryCategoryModal = ({ route }: Props) => {
  const { entryCategories } = useCatalogsStore();
  const navigation = useNavigation();

  const handleSelection = (value: EntryCategory) => {
    const onSelect = route.params?.onSelect;
    if (onSelect) {
      onSelect(value);
    }

    navigation.goBack();
  };

  return (
    <MainLayout title="Selecciona una categoria">
      <FlatList
        data={entryCategories}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelection(item)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 15,
              flexDirection: 'row',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: '#E8E8E8',
              alignItems: 'center',
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  paddingBottom: 5,
                }}
              >
                {item.name}
              </Text>
              <Text style={{ textTransform: 'capitalize', color: '#AEAEAE' }}>{item.name}</Text>
            </View>
            <ChevronRight />
          </TouchableOpacity>
        )}
      />
    </MainLayout>
  );
};
