import { Account, EntryCategory } from '@domain/entities';
import { SelAccountModal, SelEntryCategoryModal } from '@presentation/components/modals';
import { EntriesScreen, EntryCreateScreen } from '@presentation/screens/entries';
import { createStackNavigator } from '@react-navigation/stack';

export type EntryStackParams = {
  EntriesScreen: undefined;
  EntryCreateScreen: undefined;
  SelAccount: { onSelect: (account: Account) => void };
  SelEntryCategory: { onSelect: (entryCategory: EntryCategory) => void };
};

const Stack = createStackNavigator<EntryStackParams>();

//TODO: Implement custom navigator
export const EntryNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="EntriesScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntriesScreen" component={EntriesScreen} />
      <Stack.Screen name="EntryCreateScreen" component={EntryCreateScreen} />

      <Stack.Screen
        name="SelAccount"
        component={SelAccountModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="SelEntryCategory"
        component={SelEntryCategoryModal}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};
