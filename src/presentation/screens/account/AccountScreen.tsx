import { LoadEntries } from "@actions/entries/load-entries";
import { formatCurrency, groupEntriesByDate } from "@infrastructure/utils";
import { FabButton } from "@presentation/components";
import { EntryList } from "@presentation/components/entries";
import { MainLayout } from "@presentation/layout";
import { AccountStackParams } from "@presentation/navigation/AccountsNavigation";
import { StackScreenProps } from "@react-navigation/stack";
import { useAccountStore } from "@store/useAccountStore";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props extends StackScreenProps<AccountStackParams, "AccountScreen"> {}

export const AccountScreen = ({ route }: Props) => {
  const accountIdRef = useRef(route.params.accountId);

  const { getById } = useAccountStore();
  const account = getById(accountIdRef.current);

  const balanceStyle =
    account.balance < 0 ? styles.negativeBalance : styles.positiveBalance;

  const queryKey = `entries_${accountIdRef.current}`;
  //TODO: implement pull to refresh
  //TODO: use 'isLoading'
  const { isLoading, data, fetchNextPage } = useInfiniteQuery({
    queryKey: [queryKey, "infinite"],
    initialPageParam: 1,
    staleTime: 1000 * 10,
    queryFn: async (params) =>
      LoadEntries(params.pageParam, accountIdRef.current),
    getNextPageParam: (lastPage, allPages) => {
      const newPage = lastPage.meta.hasNextPage ? allPages.length + 1 : null;
      return newPage;
    },
  });

  const allEntries = data?.pages.flatMap((page) => page.data) || [];
  const grupedData = groupEntriesByDate(allEntries);

  return (
    <MainLayout title={account.name}>
      <View style={styles.header}>
        <Text style={styles.balanceLabel}>Balance Actual</Text>
        <Text style={[styles.balanceText, balanceStyle]}>
          {formatCurrency(account.balance)}
        </Text>
        {account.bank && (
          <Text style={styles.detailText}>Banco: {account.bank}</Text>
        )}
        {account.accountNumber && (
          <Text style={styles.detailText}>Número: {account.accountNumber}</Text>
        )}
      </View>

      <View style={styles.transactionsContainer}>
        <EntryList group={grupedData} fetchNextPage={fetchNextPage} />
      </View>

      <FabButton onPress={() => console.log("aca")} />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  balanceLabel: {
    fontSize: 16,
    color: "#666",
  },
  balanceText: {
    fontSize: 36,
    fontWeight: "bold",
    marginVertical: 5,
  },
  positiveBalance: {
    color: "#28A745",
  },
  negativeBalance: {
    color: "#DC3545",
  },
  detailText: {
    fontSize: 14,
    color: "#888",
  },
  transactionsContainer: {
    flex: 1,
    paddingHorizontal: 5,
    marginTop: 10,
  },
});
