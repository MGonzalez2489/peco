import {
  EntriesScreen,
  EntryCreateScreen,
} from "@presentation/screens/entries";
import { createStackNavigator } from "@react-navigation/stack";

export type EntryStackParams = {
  EntriesScreen: undefined;
  EntryCreateScreen: undefined;
};

const Stack = createStackNavigator<EntryStackParams>();

export const EntryNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="EntriesScreen" component={EntriesScreen} />
      <Stack.Screen name="EntryCreateScreen" component={EntryCreateScreen} />
    </Stack.Navigator>
  );
};
