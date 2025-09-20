import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '@store/useAuthStore';
import { AuthNavigator } from './AuthNavigation';
import { AppNavigator } from './app';

export type RootNavigatorParams = {
  Auth: undefined;
  App: undefined;
};

const Stack = createStackNavigator<RootNavigatorParams>();

export const RootNavigator = () => {
  const { isAuthenticated } = useAuthStore();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // Rutas privadas: El Drawer Navigator principal
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        // Rutas públicas: El Stack de Autenticación
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
