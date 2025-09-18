import { LoadEntries } from '@actions/entries/load-entries';
import { groupEntriesByDate } from '@infrastructure/utils';
import { FabButton, InputText } from '@presentation/components';
import { EntryList } from '@presentation/components/entries';
import { MainLayout } from '@presentation/layout';
import { EntryStackParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchIcon, TrendingDown, TrendingUp } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

export const EntriesScreen = () => {
  const navigation = useNavigation<StackNavigationProp<EntryStackParams>>();

  const { isLoading, data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['entries', 'infinite'],
    initialPageParam: 1,
    staleTime: 1000 * 60,
    queryFn: async (params) => LoadEntries(params.pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const newPage = lastPage.meta.hasNextPage ? allPages.length + 1 : null;
      return newPage;
    },
  });

  const allEntries = data?.pages.flatMap((page) => page.data) || [];
  const grupedData = groupEntriesByDate(allEntries);

  return (
    <MainLayout title="Entries" useDrawer={true}>
      {/* TODO: FIX MOCK SUMMARY */}
      <View style={{ flex: 1 }}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <TrendingUp size={24} color="#34C759" />
            <View>
              <Text style={styles.summaryLabel}>Ingresos</Text>
              <Text style={styles.summaryAmount}>$152.52</Text>
            </View>
          </View>
          <View style={styles.summarySeparator} />
          <View style={styles.summaryRow}>
            <TrendingDown size={24} color="#FF3B30" />
            <View>
              <Text style={styles.summaryLabel}>Gastos</Text>
              <Text style={styles.summaryAmount}>$263.10</Text>
            </View>
          </View>
        </View>

        {/* TODO: IMPLEMENT SEARCH INPUT */}
        <InputText placeholder="Buscar" LeftIcon={SearchIcon} autoCapitalize="none" />

        <View style={{ flex: 1 }}>
          <EntryList group={grupedData} fetchNextPage={fetchNextPage} showAccount={true} />
        </View>
      </View>

      <FabButton onPress={() => navigation.navigate('EntryCreateScreen')} />
    </MainLayout>
  );
};

// --- Estilos ---

const styles = StyleSheet.create({
  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summarySeparator: {
    width: 1,
    height: '80%',
    backgroundColor: '#eee',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});
