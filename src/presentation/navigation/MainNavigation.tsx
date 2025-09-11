import { createDrawerNavigator } from "@react-navigation/drawer";
import { HomeScreen } from "../screens/home/HomeScreen";
import { AccountsNavigator } from "./AccountsNavigation";
import { EntryNavigator } from "./EntryNavigation";

export type MainDrawerParams = {
  Home: undefined;
  Accounts: undefined;
  Entries: undefined;
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
      <Drawer.Screen
        name="Entries"
        component={EntryNavigator}
        options={{ headerShown: false }}
      />
    </Drawer.Navigator>
  );
};
