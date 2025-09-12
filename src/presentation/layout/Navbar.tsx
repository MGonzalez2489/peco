import { MainDrawerParams } from "@presentation/navigation";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "@styles/colors";
import { ChevronLeft, TextAlignJustify } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  title: string;
  useDrawer?: boolean;
}
export const Navbar = ({ title, useDrawer = false }: Props) => {
  const { top } = useSafeAreaInsets();
  const { canGoBack, goBack } = useNavigation();
  const mainNavigation =
    useNavigation<DrawerNavigationProp<MainDrawerParams>>();

  const renderLeftOption = () => {
    if (useDrawer) {
      return (
        <TouchableOpacity onPress={mainNavigation.openDrawer}>
          <TextAlignJustify color={COLORS.primary} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={goBack}>
        <ChevronLeft color={COLORS.primary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ ...styles.container, paddingTop: top }}>
      {renderLeftOption()}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
