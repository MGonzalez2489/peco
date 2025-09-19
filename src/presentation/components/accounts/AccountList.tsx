import { Account } from '@domain/entities';
import { FlatList, View } from 'react-native';
import { AccountListItem } from './AccountListItem';

type ListComponent = React.ReactElement | null;

interface Props {
  accounts: Account[];
  listHeaderComponent?: ListComponent;
  listFooterComponent?: ListComponent;
}
export const AccountList = ({ accounts, listHeaderComponent, listFooterComponent }: Props) => {
  return (
    <FlatList
      data={accounts}
      renderItem={({ item }) => <AccountListItem account={item} />}
      keyExtractor={(item) => item.publicId}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeaderComponent}
      ListFooterComponent={listFooterComponent}
    />
  );
};
