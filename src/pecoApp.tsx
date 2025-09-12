import { NavigationContainer } from "@react-navigation/native";
import { useAccountStore } from "@store/useAccountStore";
import { useCatalogsStore } from "@store/useCatalogsStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MainNavigator } from "./presentation/navigation";
import { useAuthStore } from "./presentation/store/useAuthStore";
import { StatusBar, StyleSheet } from "react-native";

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
        <SafeAreaView style={styles.container}>
          <MainNavigator />
        </SafeAreaView>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight,
  },
});
