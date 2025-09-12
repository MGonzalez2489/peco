import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";
import { useAuthStore } from "@store/useAuthStore";
import { COLORS } from "@styles/colors";
import { HelpCircle, LogOut } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const PecoDrawer = (props: DrawerContentComponentProps) => {
  const { logout } = useAuthStore();
  const handleLogout = () => {
    logout();
    props.navigation.closeDrawer();
  };

  return (
    <View style={styles.container}>
      {/* Content */}
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
        <DrawerItem
          label="test item"
          icon={() => <HelpCircle />}
          onPress={() => alert("hola")}
        />
      </DrawerContentScrollView>
      {/* Footer */}
      <View>
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={20} color={COLORS.primary} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.primary,
  },
});
