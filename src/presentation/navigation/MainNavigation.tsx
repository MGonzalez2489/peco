import { createDrawerNavigator } from "@react-navigation/drawer";
import { HomeScreen } from "../screens/home/HomeScreen";
import { AccountScreen } from "../screens/account";

export type MainDrawerParams = {
  HomeScreen: undefined;
  AccountsScreen: undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParams>();

export const MainNavigator = () => {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="HomeScreen" component={HomeScreen} />
      <Drawer.Screen name="AccountsScreen" component={AccountScreen} />
    </Drawer.Navigator>
  );
};
