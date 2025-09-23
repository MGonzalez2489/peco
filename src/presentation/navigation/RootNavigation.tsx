import { LoginScreen, RegisterScreen } from '@presentation/screens/auth';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '@store/useAuthStore';
import { AppNavigator } from './app';

export type RootNavigatorParams = {
  LoginScreen: undefined;
  RegisterScreen: undefined;
  App: undefined;
};

const Stack = createStackNavigator<RootNavigatorParams>();

export const RootNavigator = () => {
  const { isAuthenticated } = useAuthStore();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // Rutas privadas: El Drawer Navigator principal
        <Stack.Group>
          <Stack.Screen name="App" component={AppNavigator} />
        </Stack.Group>
      ) : (
        // Rutas públicas: El Stack de Autenticación
        <Stack.Group>
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};
