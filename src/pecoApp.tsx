import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigator } from "./presentation/navigation/StackNavigation";

export const PecoApp = () => {
  // const colorScheme = useColorScheme();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationContainer>
        <StackNavigator />
      </NavigationContainer>
    </SafeAreaView>
  );
};
