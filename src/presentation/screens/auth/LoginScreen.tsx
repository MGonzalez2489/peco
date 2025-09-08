import { Text, View, StyleSheet, Button } from "react-native";

export const LoginScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Hola soy el login</Text>
      <Button title="Ingresar"></Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
