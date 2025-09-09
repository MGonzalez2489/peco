import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthNavigator, MainNavigator } from "./presentation/navigation";
import { useAuthStore } from "./presentation/store/auth/useAuthStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

//TODO: use AuthProvider

const queryClient = new QueryClient();
export const PecoApp = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer>
          {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </SafeAreaView>
    </QueryClientProvider>
  );
};
