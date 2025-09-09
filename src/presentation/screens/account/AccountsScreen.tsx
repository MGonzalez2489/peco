import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { useAccountStore } from "@store/useAccountStore";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MainLayout } from "src/presentation/layout";
import { MainDrawerParams } from "src/presentation/navigation";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Reusable Account Item Component

export const AccountsScreen = () => {
  const { accounts } = useAccountStore();
  const navigation = useNavigation<DrawerNavigationProp<MainDrawerParams>>();

  const AccountItem = ({ account }) => {
    const balanceStyle =
      account.balance < 0 ? styles.negativeBalance : styles.positiveBalance;

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => {
          navigation.navigate("AccountScreen", { accountId: account.publicId });
        }}
      >
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

  return (
    <MainLayout title="Cuentas">
      <View>
        <FlatList
          data={accounts}
          renderItem={({ item }) => <AccountItem account={item} />}
          keyExtractor={(item) => item.publicId}
        />
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
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
