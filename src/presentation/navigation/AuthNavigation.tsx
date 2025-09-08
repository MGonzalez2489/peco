import { createStackNavigator } from "@react-navigation/stack";
import { LoginScreen, RegisterScreen } from "../screens/auth";

export type AuthStackParams = {
  LoginScreen: undefined;
  RegisterScreen: undefined;
  // HomeScreen: undefined;
  // AccountsScreen: undefined;
  // AccountScreen: { accountId: string };
};

const Stack = createStackNavigator<AuthStackParams>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      {/* <Stack.Screen name="HomeScreen" component={HomeScreen} /> */}
      {/* <Stack.Screen name="AccountsScreen" component={AccountsScreen} /> */}
      {/* <Stack.Screen name="AccountScreen" component={AccountScreen} /> */}
    </Stack.Navigator>
  );
};
