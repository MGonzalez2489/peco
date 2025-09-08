import { createDrawerNavigator } from "@react-navigation/drawer";
import { AccountsScreen } from "../screens/account";
import { HomeScreen } from "../screens/home/HomeScreen";

export type MainDrawerParams = {
  HomeScreen: undefined;
  AccountsScreen: undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParams>();

export const MainNavigator = () => {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="HomeScreen" component={HomeScreen} />
      <Drawer.Screen name="AccountsScreen" component={AccountsScreen} />
    </Drawer.Navigator>
  );
};
