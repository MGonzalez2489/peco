import { FlatList, StyleSheet, View } from "react-native";
import { Account } from "src/domain/entities";
import { AccountListItem } from "./AccountListItem";

interface Props {
  accounts: Account[];
}
export const AccountList = ({ accounts }: Props) => {
  return (
    <View style={styles.container}>
      <FlatList
        data={accounts}
        renderItem={({ item }) => <AccountListItem account={item} />}
        keyExtractor={(item) => item.publicId}
        contentContainerStyle={styles.container}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // gap: 10,
  },
});
