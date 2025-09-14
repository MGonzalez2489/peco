import { useLogout } from '@presentation/hooks';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { useAuthStore } from '@store/useAuthStore';
import { COLORS } from '@styles/colors';
import { LogOut } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const PecoDrawer = (props: DrawerContentComponentProps) => {
  const { top, bottom } = useSafeAreaInsets();
  const { doLogout } = useLogout();
  const { user } = useAuthStore();
  const handleLogout = () => {
    doLogout();
    props.navigation.closeDrawer();
  };

  return (
    <View
      style={{
        ...styles.container,
        paddingTop: top,
        paddingBottom: bottom,
      }}
    >
      {user && (
        <View style={styles.header}>
          <Image source={{ uri: user.avatar }} style={styles.profileImage} />
          <Text style={styles.profileName}>{user.email}</Text>
        </View>
      )}

      {/* Content */}
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 20 }}>
        <DrawerItemList {...props} />
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
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.primary,
  },
});
