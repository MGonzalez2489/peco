import { LoadEntries } from '@actions/entries/load-entries';
import { groupEntriesByDate } from '@infrastructure/utils';
import { FabButton } from '@presentation/components';
import { EntryList } from '@presentation/components/entries';
import { MainLayout } from '@presentation/layout';
import { EntryStackParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

export const EntriesScreen = () => {
  const navigation = useNavigation<StackNavigationProp<EntryStackParams>>();

  const { isLoading, data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['entries', 'infinite'],
    initialPageParam: 1,
    // staleTime: 1000 * 10,
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
      <View style={styles.transactionsContainer}>
        <EntryList group={grupedData} fetchNextPage={fetchNextPage} showAccount={true} />
      </View>

      <FabButton onPress={() => navigation.navigate('EntryCreateScreen')} />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  transactionsContainer: {
    flex: 1,
    paddingHorizontal: 5,
    marginTop: 10,
  },
});
