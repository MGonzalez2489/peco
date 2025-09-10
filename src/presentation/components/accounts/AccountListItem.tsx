import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Account } from "src/domain/entities";
import { MainDrawerParams } from "src/presentation/navigation";

interface Props {
  account: Account;
}

export const AccountListItem = ({ account }: Props) => {
  const navigation = useNavigation<DrawerNavigationProp<MainDrawerParams>>();
  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate("AccountScreen", { accountId: account.publicId });
      }}
    >
      <View style={styles.card}>
        <View>
          <Text style={styles.title}>{account.name}</Text>
          <Text style={styles.subtitle}>{account.type.displayName}</Text>
        </View>
        <Text style={styles.text}>{account.balance}</Text>
      </View>
      {/* <View style={styles.card}> */}
      {/*   <Text>{account.name}</Text> */}
      {/* </View> */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderBottomColor: "#CFCFCF",
    borderBottomWidth: 1,
    height: 105,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "semibold",
    textTransform: "capitalize",
  },
  subtitle: {
    fontSize: 15,
    color: "#222",
    fontWeight: "300",
    textTransform: "capitalize",
  },
  text: {
    fontSize: 17,
    color: "#444444",
    lineHeight: 24,
    fontWeight: "800",
  },
});
