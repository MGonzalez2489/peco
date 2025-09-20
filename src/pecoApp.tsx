import { NavigationContainer } from '@react-navigation/native';
import { useAccountStore } from '@store/useAccountStore';
import { useCatalogsStore } from '@store/useCatalogsStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './presentation/store/useAuthStore';
import { RootNavigator } from '@presentation/navigation';

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
  }, [isAuthenticated, load, loadAccounts, loadCatalogs, accounts.length]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
  },
});
