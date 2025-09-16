import { COLORS } from '@styles/colors';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

// Use the standard onChangeText prop from TextInputProps
interface Props extends TextInputProps {
  label?: string;
  errorMsg?: string;
}

export const InputText = ({ label, errorMsg, ...rest }: Props) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TextInput
        style={[styles.input, errorMsg && styles.inputError]}
        placeholderTextColor="#A0A0A0"
        {...rest}
      />

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
    </View>
  );
};

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
