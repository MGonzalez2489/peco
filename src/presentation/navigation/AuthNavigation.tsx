import { createStackNavigator } from "@react-navigation/stack";
import { LoginScreen, RegisterScreen } from "../screens/auth";
import { HomeScreen } from "../screens/home/HomeScreen";
import { AccountScreen, AccountsScreen } from "../screens/account";

export type RootStackParams = {
  LoginScreen: undefined;
  RegisterScreen: undefined;
  HomeScreen: undefined;
  AccountsScreen: undefined;
  AccountScreen: { accountId: string };
};

const Stack = createStackNavigator<RootStackParams>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="AccountsScreen" component={AccountsScreen} />
      <Stack.Screen name="AccountScreen" component={AccountScreen} />
    </Stack.Navigator>
  );
};
