import { useAccountStore } from "@store/useAccountStore";
import { StyleSheet, View } from "react-native";
import { AccountList } from "src/presentation/components/accounts";
import { MainLayout } from "src/presentation/layout";

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

  return (
    <MainLayout title="Cuentas">
      <View style={styles.container}>
        <AccountList accounts={accounts} />
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
