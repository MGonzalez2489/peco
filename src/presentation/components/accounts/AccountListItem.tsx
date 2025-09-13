import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { ChevronRight, Landmark } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Account } from "src/domain/entities";
import { MainDrawerParams } from "src/presentation/navigation";

interface Props {
  account: Account;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const AccountListItem = ({ account }: Props) => {
  const navigation = useNavigation<DrawerNavigationProp<MainDrawerParams>>();
  // Determine balance style (positive or negative)
  const balanceStyle =
    account.balance < 0 ? styles.negativeBalance : styles.positiveBalance;

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => {
        navigation.navigate("AccountScreen", { accountId: account.publicId });
      }}
    >
      <View style={styles.iconContainer}>
        <Landmark size={24} color="#2D4159" />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{account.name}</Text>
        <Text style={styles.subtitle}>{account.type.displayName}</Text>
      </View>

      <View style={styles.rightContentContainer}>
        <Text style={[styles.balanceText, balanceStyle]}>
          {formatCurrency(account.balance)}
        </Text>
        <ChevronRight size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomColor: "#F0F0F0",
    borderBottomWidth: 1,
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1, // This is the key change: lets the text container fill the space
  },
  rightContentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textTransform: "capitalize",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  balanceText: {
    fontSize: 17,
    fontWeight: "800",
    marginRight: 8,
  },
  positiveBalance: {
    color: "#4CAF50",
  },
  negativeBalance: {
    color: "#E53935",
  },
});
