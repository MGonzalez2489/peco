import { createDrawerNavigator } from "@react-navigation/drawer";
import { AccountScreen, AccountsScreen } from "../screens/account";
import { HomeScreen } from "../screens/home/HomeScreen";

export type MainDrawerParams = {
  HomeScreen: undefined;
  AccountsScreen: undefined;
  AccountScreen: { accountId: string };
};

const Drawer = createDrawerNavigator<MainDrawerParams>();

export const MainNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="HomeScreen"
      screenOptions={{ headerShown: true }}
    >
      <Drawer.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ title: "Inicio" }}
      />
      <Drawer.Screen
        name="AccountsScreen"
        component={AccountsScreen}
        options={{ title: "Cuentas" }}
      />
      <Drawer.Screen
        name="AccountScreen"
        component={AccountScreen}
        options={{
          title: "Detalles",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer.Navigator>
  );
};
