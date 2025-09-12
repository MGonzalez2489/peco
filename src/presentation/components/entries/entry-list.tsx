import { Entry } from "@domain/entities";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { EntryListItem } from "./entry-list-item";
import { GroupedEntriesDto } from "@infrastructure/dtos/entries";

interface Props {
  group: GroupedEntriesDto[];
  fetchNextPage: any;
  showAccount?: boolean;
}
export const EntryList = ({
  group,
  fetchNextPage,
  showAccount = false,
}: Props) => {
  const renderItem = ({
    item,
  }: {
    item: { date: string; entries: Entry[] };
  }) => (
    <View>
      <Text>{item.date}</Text>
      <FlatList
        data={item.entries}
        renderItem={({ item: entry }) => (
          <EntryListItem entry={entry} showAccount={showAccount} />
        )}
        keyExtractor={(entry) => entry.publicId}
      />
    </View>
  );

  return (
    <FlatList
      data={group}
      renderItem={renderItem}
      keyExtractor={(item) => item.date}
      ListEmptyComponent={
        <Text style={styles.emptyListText}>
          No hay transacciones registradas.
        </Text>
      }
      onEndReached={fetchNextPage}
      onEndReachedThreshold={0.8}
    />
  );
};

const styles = StyleSheet.create({
  emptyListText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
  },
});
