import { formatCurrency } from '@infrastructure/utils';
import { AccountStackParams } from '@presentation/navigation/app';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Account } from 'src/domain/entities';

interface Props {
  account: Account;
}

export const AccountListItem = ({ account }: Props) => {
  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();
  // Determine balance style (positive or negative)
  const isNegative = account.balance < 0;
  const IconComponent = account.type.iconItem;

  return (
    <TouchableOpacity
      style={styles.accountItemCard}
      onPress={() => navigation.navigate('AccountDetails', { id: account.publicId })}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.accountIcon, { backgroundColor: account.type.color }]}>
          <IconComponent size={24} color="#fff" />
        </View>
        <View>
          <Text style={styles.accountName}>{account.name}</Text>
          <Text style={styles.accountType}>{account.type.displayName}</Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        <Text
          style={[
            styles.accountBalance,
            isNegative ? styles.negativeBalance : styles.positiveBalance,
          ]}
        >
          {formatCurrency(account.balance)}
        </Text>
        <ChevronRight size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  accountItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  accountIcon: {
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  accountType: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  positiveBalance: {
    color: '#34C759', // Verde para balance positivo
  },
  negativeBalance: {
    color: '#FF3B30', // Rojo para balance negativo
  },
});
