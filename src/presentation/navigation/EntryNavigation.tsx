import { Account, Entry, EntryCategory } from '@domain/entities';
import { SelAccountModal, SelEntryCategoryModal } from '@presentation/components/modals';
import { EntriesScreen, EntryCreateScreen } from '@presentation/screens/entries';
import { EntryCreateSuccessScreen } from '@presentation/screens/entries/EntryCreateSuccessScreen';
import { createStackNavigator } from '@react-navigation/stack';

export type EntryStackParams = {
  EntriesScreen: undefined;
  EntryCreateScreen: undefined;
  EntryCreateSuccessScreen: { entry: Entry };
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
      <Stack.Screen name="EntryCreateSuccessScreen" component={EntryCreateSuccessScreen} />

      <Stack.Screen
        name="SelAccount"
        component={SelAccountModal}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="SelEntryCategory"
        component={SelEntryCategoryModal}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
};
