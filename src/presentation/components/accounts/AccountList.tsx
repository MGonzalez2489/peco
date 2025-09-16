import { Account } from '@domain/entities';
import { FlatList } from 'react-native';
import { AccountListItem } from './AccountListItem';

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
