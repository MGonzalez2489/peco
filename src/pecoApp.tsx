import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthNavigator, MainNavigator } from "./presentation/navigation";
import { useAuthStore } from "./presentation/store/useAuthStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAccountStore } from "@store/useAccountStore";

//TODO: use AuthProvider

const queryClient = new QueryClient();
export const PecoApp = () => {
  const { isAuthenticated } = useAuthStore();
  const { load, accounts } = useAccountStore();

  //TODO: See where to load data in background
  useEffect(() => {
    if (isAuthenticated && accounts.length === 0) load();
  }, [isAuthenticated]);

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
