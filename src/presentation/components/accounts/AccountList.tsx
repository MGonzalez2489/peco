import { Account } from '@domain/entities';
import { FlatList } from 'react-native';
import { AccountListItem } from './AccountListItem';

interface Props {
  accounts: Account[];
}
//TODO: ADD ITEM SEPARATOR TO THE FLATLIST ITEM
export const AccountList = ({ accounts }: Props) => {
  return (
    <FlatList
      data={accounts}
      renderItem={({ item }) => <AccountListItem account={item} />}
      keyExtractor={(item) => item.publicId}
    />
  );
};

// const styles = StyleSheet.create({
//   separator: {
//     // Si quieres un separador entre tarjetas
//     padding: 5,
//     backgroundColor: 'red',
//   },
// });
