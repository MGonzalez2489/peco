import {
  EntriesScreen,
  EntryCreateScreen,
} from "@presentation/screens/entries";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { Menu } from "lucide-react-native";
import { TouchableOpacity } from "react-native";
import { MainDrawerParams } from "./MainNavigation";

export type EntryStackParams = {
  EntriesScreen: undefined;
  EntryCreateScreen: undefined;
};

const Stack = createStackNavigator<EntryStackParams>();
interface Props {
  navigation: DrawerNavigationProp<MainDrawerParams>;
}

//TODO: Implement custom navigator
export const EntryNavigator = ({ navigation }: Props) => {
  return (
    <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="EntriesScreen"
        component={EntriesScreen}
        options={{
          headerTitle: "Transacciones",
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
              <Menu style={{ paddingLeft: 50 }} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="EntryCreateScreen" component={EntryCreateScreen} />
    </Stack.Navigator>
  );
};
