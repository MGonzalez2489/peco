import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthNavigator, MainNavigator } from "./presentation/navigation";
import { useAuthStore } from "./presentation/store/auth/useAuthStore";

export const PecoApp = () => {
  // const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuthStore();
  // const [isAuthenticated, setIsAuthenticated] = useState(false); // TODO: REview a better aproach

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationContainer>
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </SafeAreaView>
  );
};
