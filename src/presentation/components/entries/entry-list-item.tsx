import { Entry } from '@domain/entities';
import { ChevronRight, SquareStarIcon } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  entry: Entry;
  showAccount: boolean;
}

//TODO: implement swipe right
export const EntryListItem = ({ entry, showAccount }: Props) => {
  const isIncome = entry.type.name === 'income';

  const IconComponent = SquareStarIcon;
  return (
    <TouchableOpacity style={styles.entryItemCard}>
      <View style={styles.itemLeft}>
        <View
          style={[styles.entryIconWrapper, { backgroundColor: isIncome ? '#E6F4E6' : '#FEEBEB' }]}
        >
          <IconComponent size={24} color={entry.type.color} />
        </View>
        <View>
          <Text style={styles.entryDescription}>{entry.description}</Text>
          <Text style={styles.entryAccount}>
            {entry.account.name} •{' '}
            {new Date(entry.createdAt).toLocaleTimeString('es-ES', {
              hour12: true,
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.itemRight}>
        <Text style={[styles.entryAmount, { color: entry.type.color }]}>
          {isIncome ? '+' : '-'}${Math.abs(entry.amount).toFixed(2)}
        </Text>
        <ChevronRight size={16} color="#999" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  entryItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  entryIconWrapper: {
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryDescription: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryAccount: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
});
