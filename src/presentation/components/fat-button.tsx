import { Plus } from "lucide-react-native";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export const FAB = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress}>
      <View style={styles.fabIcon}>
        <Plus size={24} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    right: 30,
    bottom: 30,
    backgroundColor: "#007AFF", // Color primario de tu paleta
    borderRadius: 30,
    elevation: 8, // Sombra para Android
    shadowColor: "#000", // Sombra para iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    // Un contenedor para el ícono si es necesario
  },
});
