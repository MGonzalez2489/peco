import { Account, AccountType } from '@domain/entities';
import { SelAccountTypeModal } from '@presentation/components/modals';
import { createStackNavigator } from '@react-navigation/stack';
import { AccountCreateScreen, AccountScreen, AccountsScreen } from '../screens/account';
import { AccountCreateSuccessScreen } from '../screens/account/AccountCreateSuccessScreen';

export type AccountStackParams = {
  AccountsScreen: undefined;
  AccountScreen: { accountId: string };

  SelAccountType: { onSelect: (accountType: AccountType) => void };
  AccountCreateScreen: { accountType: AccountType };
  AccountCreateSuccessScreen: { account: Account };
};

const Stack = createStackNavigator<AccountStackParams>();

//TODO: Implement custom navigator
export const AccountsNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="AccountsScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountsScreen" component={AccountsScreen} />
      <Stack.Screen name="AccountScreen" component={AccountScreen} />
      {/* CreateAccount */}
      <Stack.Group
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="SelAccountType" component={SelAccountTypeModal} />
        <Stack.Screen name="AccountCreateScreen" component={AccountCreateScreen} />
        <Stack.Screen name="AccountCreateSuccessScreen" component={AccountCreateSuccessScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
};
