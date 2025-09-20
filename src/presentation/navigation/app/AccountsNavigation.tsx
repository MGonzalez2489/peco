import {
  AccountsDashboardScreen,
  CreateAccountConfirmationScreen,
  CreateAccountScreen,
  DetailAccountScreen,
} from '@presentation/screens/account';
import { createStackNavigator } from '@react-navigation/stack';

export type AccountStackParams = {
  AccountDashboard: undefined;
  AccountDetails: { id: string };

  CreateAccountForm: undefined;
  CreateAccountConfirmation: undefined;

  UpdateAccountForm: undefined;
  UpdateAccountConfirmation: undefined;

  DeleteAccountForm: undefined;
  DeleteAccountConfirmation: undefined;
};

const Stack = createStackNavigator<AccountStackParams>();

export const AccountsNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountDashboard" component={AccountsDashboardScreen} />
      <Stack.Screen name="AccountDetails" component={DetailAccountScreen} />

      {/* CRUD */}
      <Stack.Screen name="CreateAccountForm" component={CreateAccountScreen} />
      {/* <Stack.Screen name="UpdateAccountForm" component={CreateAccountScreen} /> */}
      {/* <Stack.Screen name="DeleteAccountForm" component={CreateAccountScreen} /> */}

      {/* Confirmation */}
      <Stack.Screen name="CreateAccountConfirmation" component={CreateAccountConfirmationScreen} />
      {/* <Stack.Screen name="UpdateAccountConfirmation" component={CreateAccountSuccessScreen} /> */}
      {/* <Stack.Screen name="DeleteAccountConfirmation" component={CreateAccountSuccessScreen} /> */}
    </Stack.Navigator>
  );
};
