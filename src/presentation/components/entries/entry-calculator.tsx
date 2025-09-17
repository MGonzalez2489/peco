import { useCalculator } from '@presentation/hooks';
import { COLORS } from '@styles/colors';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { EntryCalculatorBtn } from './entry-calculator-button';

interface Props {
  handleValue: (value) => void;
}

export const EntryCalculator = ({ handleValue }: Props) => {
  const {
    number,
    buildNumber,
    clearAll,
    deleteLastDigit,
    toggleSign,
    divideOperation,
    multiplyOperation,
    subtractOperation,
    addOperation,
    calcResult,
  } = useCalculator();

  useEffect(() => {
    handleValue(number);
  }, [number, handleValue]);

  return (
    <View style={styles.calculatorContainer}>
      <View style={styles.row}>
        <EntryCalculatorBtn
          onPress={() => clearAll()}
          label="C"
          color={COLORS.lightGray}
          blackText
        />
        <EntryCalculatorBtn
          onPress={() => toggleSign()}
          label="+/-"
          color={COLORS.lightGray}
          blackText
        />
        <EntryCalculatorBtn
          onPress={() => deleteLastDigit()}
          label="del"
          color={COLORS.lightGray}
          blackText
        />
        <EntryCalculatorBtn onPress={() => divideOperation()} label="÷" color={COLORS.lightGray} />
      </View>
      <View style={styles.row}>
        <EntryCalculatorBtn label="7" onPress={() => buildNumber('7')} />
        <EntryCalculatorBtn label="8" onPress={() => buildNumber('8')} />
        <EntryCalculatorBtn label="9" onPress={() => buildNumber('9')} />
        <EntryCalculatorBtn
          label="X"
          onPress={() => multiplyOperation()}
          color={COLORS.lightGray}
        />
      </View>
      <View style={styles.row}>
        <EntryCalculatorBtn label="4" onPress={() => buildNumber('4')} />
        <EntryCalculatorBtn label="5" onPress={() => buildNumber('5')} />
        <EntryCalculatorBtn label="6" onPress={() => buildNumber('6')} />
        <EntryCalculatorBtn
          label="-"
          onPress={() => subtractOperation()}
          color={COLORS.lightGray}
        />
      </View>
      <View style={styles.row}>
        <EntryCalculatorBtn label="1" onPress={() => buildNumber('1')} />
        <EntryCalculatorBtn label="2" onPress={() => buildNumber('2')} />
        <EntryCalculatorBtn label="3" onPress={() => buildNumber('3')} />
        <EntryCalculatorBtn label="+" onPress={() => addOperation()} color={COLORS.lightGray} />
      </View>
      <View style={styles.row}>
        <EntryCalculatorBtn label="0" dobleSize onPress={() => buildNumber('0')} />
        <EntryCalculatorBtn label="." onPress={() => buildNumber('.')} />
        <EntryCalculatorBtn label="=" onPress={() => calcResult()} color={COLORS.lightGray} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calculatorContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
});
