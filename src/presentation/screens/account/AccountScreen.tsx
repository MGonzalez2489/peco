import { LoadEntries } from "@actions/entries/load-entries";
import { Entry } from "@domain/entities";
import { StackScreenProps } from "@react-navigation/stack";
import { useAccountStore } from "@store/useAccountStore";
import { COLORS } from "@styles/colors";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CircleDollarSign } from "lucide-react-native";
import { useRef } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { MainLayout } from "src/presentation/layout";
import { AccountStackParams } from "src/presentation/navigation/AccountsNavigation";

interface Props extends StackScreenProps<AccountStackParams, "AccountScreen"> {}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Component for a single transaction item
const TransactionItem = ({ entry }: { entry: Entry }) => {
  const amountStyle =
    entry.type.name === "Expense"
      ? styles.negativeAmount
      : styles.positiveAmount;

  return (
    <View style={styles.transactionCard}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <CircleDollarSign size={25} />
        <View>
          <Text style={styles.transactionDescription}>{entry.description}</Text>
          <Text style={styles.transactionCategory}>{entry.category.name}</Text>
        </View>
      </View>
      <Text style={[styles.transactionAmount, amountStyle]}>
        {formatCurrency(entry.amount)}
      </Text>
    </View>
  );
};

export const AccountScreen = ({ route }: Props) => {
  const accountIdRef = useRef(route.params.accountId);

  const { getById } = useAccountStore();
  const account = getById(accountIdRef.current);

  const balanceStyle =
    account.balance < 0 ? styles.negativeBalance : styles.positiveBalance;

  // const { isLoading, data: entries } = useQuery({
  //   queryKey: ["entries", "infinite"],
  //   queryFn: () => LoadEntries(1, accountIdRef.current),
  // });

  const queryKey = `entries_${accountIdRef.current}`;
  //TODO: implement pull to refresh
  //TODO: move everything to separated controls
  //TODO: group all entryes by day of week
  const { isLoading, data, fetchNextPage } = useInfiniteQuery({
    queryKey: [queryKey, "infinite"],
    initialPageParam: 1,
    staleTime: 1000 * 10,
    queryFn: async (params) =>
      LoadEntries(params.pageParam, accountIdRef.current),
    getNextPageParam: (lastPage, allPages) => {
      console.log(lastPage.data);
      const newPage = lastPage.meta.hasNextPage ? allPages.length + 1 : null;
      return newPage;
    },
  });

  return (
    <MainLayout title="Cuenta">
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
        <FlatList
          data={data?.pages?.map((g) => g.data).flat() ?? []}
          renderItem={({ item }) => <TransactionItem entry={item} />}
          keyExtractor={(item) => item.publicId}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>
              No hay transacciones registradas.
            </Text>
          }
          onEndReached={fetchNextPage}
          onEndReachedThreshold={0.8}
        />
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "red",
  },
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
  transactionsHeader: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 10,
    color: COLORS.text,
  },
  transactionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    padding: 15,
    marginVertical: 5,
    borderRadius: 15,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transactionCategory: {
    fontSize: 14,
    color: "#888",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  positiveAmount: {
    color: "#28A745",
  },
  negativeAmount: {
    color: "#DC3545",
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
  },
});
