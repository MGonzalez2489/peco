import { SettingsScreen } from '@presentation/screens/settings';
import { createStackNavigator } from '@react-navigation/stack';

export type SettingsStackParams = {
  SettingsScreen: undefined;
};

const Stack = createStackNavigator<SettingsStackParams>();

export const SettingsNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    </Stack.Navigator>
  );
};
