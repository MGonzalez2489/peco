import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { COLORS } from '@styles/colors';

// Define the component's props. It expects a 'value' of type 'number' or 'null'.
interface Props extends Omit<TextInputProps, 'value'> {
  label?: string;
  value: number | null;
  errorMsg?: string;
}

export const InputNumber = ({ label, value, errorMsg, ...rest }: Props) => {
  // Convert the number value to a string for display in the TextInput.
  // We use an empty string for null to prevent the TextInput from crashing.
  const stringValue = value !== null ? String(value) : '';

  // A local state to handle the input text while the user is typing.
  const [internalValue, setInternalValue] = useState(stringValue);

  const handleOnChange = (text: string) => {
    // Update the internal state with the text the user is typing.
    setInternalValue(text);

    const numericValue = parseFloat(text);

    // Check if the input is a valid number, including handling decimals.
    if (!isNaN(numericValue) && rest.onChangeText) {
      // Call the parent's onChangeText handler with the numeric value.
      rest.onChangeText(numericValue as any);
    }
    // If the input is empty, pass null or 0 to the parent to clear the value.
    else if (text === '' && rest.onChangeText) {
      rest.onChangeText(null as any);
    }
  };
  useEffect(() => {
    setInternalValue(stringValue);
  }, [stringValue]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TextInput
        style={[styles.input, errorMsg && styles.inputError]}
        placeholderTextColor="#A0A0A0"
        // Use the internal value for the controlled component.
        value={internalValue}
        onChangeText={handleOnChange}
        keyboardType="numeric" // Ensure the numeric keyboard is always shown.
        {...rest}
        clearTextOnFocus={true}
      />

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
    </View>
  );
};

// ... Your styles remain the same
const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 5,
  },
  label: {
    marginBottom: 5,
    color: COLORS.text,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: 'red',
  },
  error: {
    color: 'red',
    marginTop: -8,
    marginBottom: 10,
  },
});
