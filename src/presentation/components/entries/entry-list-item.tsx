import { Entry } from '@domain/entities';
import { formatCurrency } from '@infrastructure/utils';
import { CircleDollarSign } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  entry: Entry;
  showAccount: boolean;
}

export const EntryListItem = ({ entry, showAccount }: Props) => {
  const amountStyle = entry.type.name === 'outcome' ? styles.negativeAmount : styles.positiveAmount;
  const isIncome = entry.type.name === 'income';

  return (
    <View style={styles.transactionCard}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <CircleDollarSign size={25} />
        <View>
          <Text style={styles.transactionDescription}>{entry.description}</Text>

          <Text style={styles.transactionCategory}>{entry.category.name}</Text>

          {showAccount && (
            <Text style={{ textTransform: 'capitalize', marginTop: 5 }}>{entry.account.name}</Text>
          )}
        </View>
      </View>
      <Text style={[styles.transactionAmount, amountStyle]}>
        {!isIncome && '-'}
        {formatCurrency(entry.amount)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  positiveBalance: {
    color: '#28A745',
  },
  negativeBalance: {
    color: '#DC3545',
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 15,
    marginVertical: 5,
    borderRadius: 15,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#888',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#28A745',
  },
  negativeAmount: {
    color: '#DC3545',
  },
});
