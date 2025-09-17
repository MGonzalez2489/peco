import { Entry } from '@domain/entities';
import { formatCurrency } from '@infrastructure/utils';
import { CircleDollarSign, PencilIcon, TrashIcon } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { COLORS } from '@styles/colors';

interface Props {
  entry: Entry;
  showAccount: boolean;
}

//TODO: improve swipe right
export const EntryListItem = ({ entry, showAccount }: Props) => {
  const amountStyle = entry.type.name === 'outcome' ? styles.negativeAmount : styles.positiveAmount;
  const isIncome = entry.type.name === 'income';
  const ACTION_WIDTH = 50;

  const RightAction = (prog: SharedValue<number>, drag: SharedValue<number>) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 50 }],
      };
    });

    return (
      <Reanimated.View style={styleAnimation}>
        <View
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '100%',
            width: ACTION_WIDTH,
          }}
        >
          <TouchableOpacity onPress={() => alert('Editar')}>
            <PencilIcon color={COLORS.lightGray} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert('Eliminar')}>
            <TrashIcon color={COLORS.lightGray} />
          </TouchableOpacity>
        </View>
      </Reanimated.View>
    );
  };

  return (
    <View style={styles.transactionCard}>
      <GestureHandlerRootView>
        <ReanimatedSwipeable
          rightThreshold={ACTION_WIDTH / 2}
          overshootRight={false}
          renderRightActions={RightAction}
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <CircleDollarSign size={25} />
              <View>
                <Text style={styles.transactionDescription}>{entry.description}</Text>

                <Text style={styles.transactionCategory}>{entry.category.name}</Text>

                {showAccount && (
                  <Text style={{ textTransform: 'capitalize', marginTop: 5 }}>
                    {entry.account.name}
                  </Text>
                )}
              </View>
            </View>
            <Text style={[styles.transactionAmount, amountStyle]}>
              {!isIncome && '-'}
              {formatCurrency(entry.amount)}
            </Text>
          </View>
        </ReanimatedSwipeable>
      </GestureHandlerRootView>
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
  rightAction: { width: 50, height: 50, backgroundColor: 'purple' },
});
