import { PecoDrawer } from '@presentation/layout/Drawer';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuthStore } from '@store/useAuthStore';
import { COLORS } from '@styles/colors';
import { Home } from 'lucide-react-native';
import { HomeScreen } from '../screens/home/HomeScreen';
import { AccountsNavigator } from './AccountsNavigation';
import { AuthNavigator } from './AuthNavigation';
import { EntryNavigator } from './EntryNavigation';

export type MainDrawerParams = {
  Auth: undefined;
  Home: undefined;
  Accounts: undefined;
  Entries: undefined;

  SelAccount: undefined;
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
            }}
          />
          <Drawer.Screen name="Accounts" component={AccountsNavigator} />
          <Drawer.Screen name="Entries" component={EntryNavigator} />
        </Drawer.Group>
      ) : (
        <Drawer.Screen name="Auth" component={AuthNavigator} options={{ swipeEnabled: false }} />
      )}
    </Drawer.Navigator>
  );
};
