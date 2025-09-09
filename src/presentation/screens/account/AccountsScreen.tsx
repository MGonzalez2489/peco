import { loadAccounts } from "@actions/account/load-accounts";
import { useQuery } from "@tanstack/react-query";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Reusable Account Item Component
const AccountItem = ({ account }) => {
  const balanceStyle =
    account.balance < 0 ? styles.negativeBalance : styles.positiveBalance;

  return (
    <TouchableOpacity style={styles.itemContainer}>
      <View style={styles.textContainer}>
        <Text style={styles.accountName}>{account.name}</Text>
        {account.bank && <Text style={styles.bankName}>{account.bank}</Text>}
      </View>
      <Text style={[styles.balanceText, balanceStyle]}>
        {formatCurrency(account.balance)}
      </Text>
    </TouchableOpacity>
  );
};

export const AccountsScreen = () => {
  const { isLoading, data: accounts = [] } = useQuery({
    queryKey: ["products", "infinite"],
    staleTime: 1000 * 60 * 60, //1 hour
    queryFn: () => loadAccounts(), // meter la paginacion como parametro
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={accounts}
        renderItem={({ item }) => <AccountItem account={item} />}
        contentContainerStyle={styles.listContainer}
        keyExtractor={(item) => item.publicId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    padding: 20,
  },
  listContainer: {
    paddingHorizontal: 10,
  },
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    flexDirection: "column",
  },
  accountName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
  },
  bankName: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  positiveBalance: {
    color: "#4CAF50",
  },
  negativeBalance: {
    color: "#E53935",
  },
});
