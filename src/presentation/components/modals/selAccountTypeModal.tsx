import { AccountType } from '@domain/entities';
import { MainLayout } from '@presentation/layout';
import { AccountStackParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { useCatalogsStore } from '@store/useCatalogsStore';
import { COLORS } from '@styles/colors';
import { LucideCircleStar } from 'lucide-react-native';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

type Props = StackScreenProps<AccountStackParams, 'SelAccountType'>;

export const SelAccountTypeModal = ({ route }: Props) => {
  const { accountTypes } = useCatalogsStore();

  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();

  const handleSelection = (value: AccountType) => {
    const onSelect = route.params?.onSelect;
    if (onSelect) {
      onSelect(value);
    }

    navigation.navigate('AccountCreateScreen', { accountType: value });
  };

  const _renderItem = (aType: AccountType) => (
    <TouchableOpacity
      style={{
        flex: 1,
        marginHorizontal: 10,
        marginBottom: 15,
        paddingHorizontal: 30,
        paddingVertical: 20,
        backgroundColor: aType.color,
        borderRadius: 10,
      }}
      onPress={() => handleSelection(aType)}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
          <LucideCircleStar color={'#F8F8F8'} size={30} />
        </View>
        <View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: 'white', paddingBottom: 10 }}>
            {aType.displayName}
          </Text>
          <Text style={{ color: '#F8F8F8' }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore...
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <MainLayout title="Selecciona un tipo de cuenta" showNavbar={false}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ color: COLORS.text }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore...
        </Text>
      </View>
      <FlatList
        data={accountTypes}
        key={'_'}
        keyExtractor={(item) => '_' + item.publicId}
        numColumns={1}
        contentContainerStyle={{ paddingVertical: 20 }}
        renderItem={({ item }) => _renderItem(item)}
      />
    </MainLayout>
  );
};
