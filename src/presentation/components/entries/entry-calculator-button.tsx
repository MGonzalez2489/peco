import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  label: string;
  color?: string;
  dobleSize?: boolean;
  blackText?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export const EntryCalculatorBtn = ({
  label,
  color = '#2D2D2D', //styles.colors.dark,
  dobleSize = false,
  blackText = false,
  onPress,
  onLongPress = undefined,
}: Props) => {
  return (
    <Pressable
      onPress={() => onPress()}
      onLongPress={() => (onLongPress ? onLongPress() : null)}
      style={({ pressed }) => ({
        ...styles.button,
        opacity: pressed ? 0.8 : 1,
        backgroundColor: color,
      })}
    >
      <Text
        style={{
          ...styles.btnText,
          color: blackText ? 'black' : 'white',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.2,
    borderColor: '#fefefe',
  },
  btnText: {
    textAlign: 'center',
    padding: 10,
    fontSize: 30,
    color: 'white',
    fontWeight: '300',
  },
});
