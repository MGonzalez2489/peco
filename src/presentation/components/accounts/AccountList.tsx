import { FlatList } from "react-native";
import { AccountListItem } from "./AccountListItem";
import { Account } from "@domain/entities";

interface Props {
  accounts: Account[];
}
export const AccountList = ({ accounts }: Props) => {
  return (
    <FlatList
      data={accounts}
      renderItem={({ item }) => <AccountListItem account={item} />}
      keyExtractor={(item) => item.publicId}
    />
  );
};
