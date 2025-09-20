import { PecoDrawer } from '@presentation/layout/Drawer';
import { HomeScreen } from '@presentation/screens/home/HomeScreen';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { COLORS } from '@styles/colors';
import { Home, SettingsIcon } from 'lucide-react-native';
import { EntryNavigator } from './EntryNavigation';
import { SettingsNavigator } from './SettingsNavigation';
import { AccountsNavigator } from './AccountsNavigation';

export type AppNavigatorParams = {
  Home: undefined;
  Accounts: undefined;
  Entries: undefined;
  Settings: undefined;
};

const Drawer = createDrawerNavigator<AppNavigatorParams>();

export const AppNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: COLORS.primary,
      }}
      drawerContent={(props) => <PecoDrawer {...props} />}
    >
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
    </Drawer.Navigator>
  );
};
