import { createStackNavigator } from "@react-navigation/stack";
import {
  AccountScreen,
  AccountsScreen,
  AccountCreateScreen,
} from "../screens/account";
import { TouchableOpacity } from "react-native";
import { Menu } from "lucide-react-native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { MainDrawerParams } from "./MainNavigation";

export type AccountStackParams = {
  AccountsScreen: undefined;
  AccountScreen: { accountId: string };
  AccountCreateScreen: undefined;
};

const Stack = createStackNavigator<AccountStackParams>();

interface Props {
  navigation: DrawerNavigationProp<MainDrawerParams>;
}

export const AccountsNavigator = ({ navigation }: Props) => {
  return (
    <Stack.Navigator initialRouteName="AccountsScreen">
      <Stack.Screen
        name="AccountsScreen"
        component={AccountsScreen}
        options={{
          headerTitle: "Cuentas",
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
              <Menu style={{ paddingLeft: 20 }} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="AccountScreen"
        component={AccountScreen}
        options={{ title: "Detalles", headerBackButtonDisplayMode: "minimal" }}
      />
      <Stack.Screen
        name="AccountCreateScreen"
        component={AccountCreateScreen}
        options={{
          title: "Crear cuenta",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
    </Stack.Navigator>
  );
};
