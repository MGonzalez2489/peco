import { PecoDrawer } from '@presentation/layout/Drawer';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuthStore } from '@store/useAuthStore';
import { COLORS } from '@styles/colors';
import { Home, SettingsIcon } from 'lucide-react-native';
import { HomeScreen } from '../screens/home/HomeScreen';
import { AccountsNavigator } from './AccountsNavigation';
import { AuthNavigator } from './AuthNavigation';
import { EntryNavigator } from './EntryNavigation';
import { SettingsNavigator } from './SettingsNavigation';

export type MainDrawerParams = {
  Auth: undefined;
  Home: undefined;
  Accounts: undefined;
  Entries: undefined;
  Settings: undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParams>();

export const MainNavigator = () => {
  const { isAuthenticated } = useAuthStore();
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: COLORS.primary,
      }}
      drawerContent={(props) => <PecoDrawer {...props} />}
    >
      {isAuthenticated ? (
        <Drawer.Group>
          <Drawer.Screen
            name="Home"
            component={HomeScreen}
            options={{
              drawerIcon: () => <Home size={18} color={COLORS.primary} />,
              title: 'Inicio',
            }}
          />
          <Drawer.Screen
            name="Accounts"
            component={AccountsNavigator}
            options={{
              drawerIcon: () => <Home size={18} color={COLORS.primary} />,
              title: 'Cuentas',
            }}
          />
          <Drawer.Screen
            name="Entries"
            component={EntryNavigator}
            options={{
              drawerIcon: () => <Home size={18} color={COLORS.primary} />,
              title: 'Transacciones',
            }}
          />
          <Drawer.Screen
            name="Settings"
            component={SettingsNavigator}
            options={{
              drawerIcon: () => <SettingsIcon size={18} color={COLORS.primary} />,
              title: 'Configuracion',
            }}
          />
        </Drawer.Group>
      ) : (
        <Drawer.Screen name="Auth" component={AuthNavigator} options={{ swipeEnabled: false }} />
      )}
    </Drawer.Navigator>
  );
};
