import { Entry } from "@domain/entities";
import { FlatList, StyleSheet, Text } from "react-native";
import { EntryListItem } from "./entry-list-item";

interface Props {
  entries: Entry[];
  fetchNextPage: any;
}
export const EntryList = ({ entries, fetchNextPage }: Props) => {
  return (
    <FlatList
      data={entries}
      renderItem={({ item }) => <EntryListItem entry={item} />}
      keyExtractor={(item) => item.publicId}
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
