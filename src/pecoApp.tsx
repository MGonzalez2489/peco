import { NavigationContainer } from "@react-navigation/native";
import { useAccountStore } from "@store/useAccountStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthNavigator, MainNavigator } from "./presentation/navigation";
import { useAuthStore } from "./presentation/store/useAuthStore";
import { useCatalogsStore } from "@store/useCatalogsStore";

//TODO: use AuthProvider

const queryClient = new QueryClient();
export const PecoApp = () => {
  const { load, isAuthenticated } = useAuthStore();
  const { loadAccounts, accounts } = useAccountStore();
  const { loadCatalogs } = useCatalogsStore();

  //TODO: See where to load data in background
  useEffect(() => {
    load();
    if (isAuthenticated && accounts.length === 0) {
      loadAccounts();
      loadCatalogs();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <SafeAreaView style={{ flex: 1 }}>
          {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
        </SafeAreaView>
      </NavigationContainer>
    </QueryClientProvider>
  );
};
