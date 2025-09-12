import { createDrawerNavigator } from "@react-navigation/drawer";
import { COLORS } from "@styles/colors";
import { Home } from "lucide-react-native";
import { HomeScreen } from "../screens/home/HomeScreen";
import { AccountsNavigator } from "./AccountsNavigation";
import { EntryNavigator } from "./EntryNavigation";
import { PecoDrawer } from "@presentation/layout/Drawer";

export type MainDrawerParams = {
  Home: undefined;
  Accounts: undefined;
  Entries: undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParams>();

export const MainNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: COLORS.primary,
      }}
      drawerContent={(props) => <PecoDrawer {...props} />}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          drawerIcon: () => <Home size={18} color={COLORS.primary} />,
        }}
      />
      <Drawer.Screen name="Accounts" component={AccountsNavigator} />
      <Drawer.Screen name="Entries" component={EntryNavigator} />
    </Drawer.Navigator>
  );
};
