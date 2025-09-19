import { GroupedEntriesDto } from '@infrastructure/dtos/entries';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SectionList, StyleSheet, Text } from 'react-native';
import { EntryListItem } from './entry-list-item';

type ListComponent = React.ReactElement | null;

interface Props {
  group: GroupedEntriesDto[];
  fetchNextPage: any;
  showAccount?: boolean;
  listHeaderComponent?: ListComponent;
  listFooterComponent?: ListComponent;
}
export const EntryList = ({
  group,
  fetchNextPage,
  showAccount = false,
  listFooterComponent,
  listHeaderComponent,
}: Props) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onPullToRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    queryClient.invalidateQueries({ queryKey: ['entries', 'infinite'] });

    setIsRefreshing(false);
  };

  const renderSectionHeader = ({ section: { title } }: { section: GroupedEntriesDto }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SectionList
      sections={group}
      keyExtractor={(item) => item.publicId}
      renderItem={({ item }) => <EntryListItem entry={item} showAccount={showAccount} />}
      onRefresh={onPullToRefresh}
      refreshing={isRefreshing}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      onEndReached={fetchNextPage}
      onEndReachedThreshold={0.7}
      ListEmptyComponent={
        <Text style={styles.emptyListText}>No hay transacciones registradas.</Text>
      }
      ListHeaderComponent={listHeaderComponent}
      ListFooterComponent={listFooterComponent}
    />
  );
};

const styles = StyleSheet.create({
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777',
    marginTop: 15,
    marginBottom: 8,
    paddingHorizontal: 5,
  },
});
