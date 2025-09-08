import { NavigationContainer } from "@react-navigation/native";
import { StackNavigator } from "./presentation/navigation/StackNavigation";

export const PecoApp = () => {
  return (
    <NavigationContainer>
      <StackNavigator />
    </NavigationContainer>
  );
};
