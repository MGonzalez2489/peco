import { COLORS } from "@styles/colors";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface Props {
  label?: string;
  value: string;
  placeholder?: string;
  onChange?: any;
  errorMsg?: string;
  isPassword?: boolean;
}

export const InputText = ({
  value,
  label,
  placeholder = "",
  onChange,
  errorMsg,
  isPassword = false,
}: Props) => {
  const [internalValue, setInternalValue] = useState("");

  const handleOnChange = (value: string) => {
    if (onChange) {
      onChange(value);
    }
    setInternalValue(value);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#A0A0A0"
        value={onChange ? value : internalValue}
        onChangeText={handleOnChange}
        secureTextEntry={isPassword}
      />

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 5,
  },
  label: {
    marginBottom: 5,
    color: COLORS.text,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  error: {
    color: "red",
  },
});
