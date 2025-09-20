import { EntryCategory } from '@domain/entities';
import { SelAccountModal, SelEntryCategoryModal } from '@presentation/components/modals';
import {
  CreateEntryConfirmationScreen,
  CreateEntryScreen,
  EntriesDashboardScreen,
} from '@presentation/screens/entries';

import { createStackNavigator } from '@react-navigation/stack';

export type EntryStackParams = {
  EntryDashboardScreen: undefined;
  // EntryDetails: { id: string };

  CreateEntryForm: undefined;
  CreateEntryConfirmation: undefined;

  // UpdateEntryForm: undefined;
  // UpdateEntryConfirmation: undefined;
  //
  //   DeleteEntryForm: undefined;
  // DeleteEntryConfirmation: undefined;

  SelectEntryType: undefined;
  SelectAccount: undefined;
  SelectEntryCategory: { onSelect: (selected: EntryCategory) => void };
};

const Stack = createStackNavigator<EntryStackParams>();

//TODO: Implement custom navigator
export const EntryNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="EntryDashboardScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntryDashboardScreen" component={EntriesDashboardScreen} />

      {/* CRUD */}
      <Stack.Screen name="CreateEntryForm" component={CreateEntryScreen} />
      {/* Confirmation */}
      <Stack.Screen name="CreateEntryConfirmation" component={CreateEntryConfirmationScreen} />

      {/* Modals */}

      <Stack.Screen
        name="SelectAccount"
        component={SelAccountModal}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="SelectEntryCategory"
        component={SelEntryCategoryModal}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
};
