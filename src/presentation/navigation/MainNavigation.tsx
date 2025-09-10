import { createDrawerNavigator } from "@react-navigation/drawer";
import { HomeScreen } from "../screens/home/HomeScreen";
import { AccountsNavigator } from "./AccountsNavigation";

export type MainDrawerParams = {
  Home: undefined;
  Accounts: undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParams>();

export const MainNavigator = () => {
  return (
    <Drawer.Navigator initialRouteName="Home">
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Inicio" }}
      />
      <Drawer.Screen
        name="Accounts"
        component={AccountsNavigator}
        options={{ headerShown: false }}
      />
    </Drawer.Navigator>
  );
};
