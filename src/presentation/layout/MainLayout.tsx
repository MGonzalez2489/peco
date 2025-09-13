import { COLORS } from "@styles/colors";
import { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Navbar } from "./Navbar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  title: string;
  subTitle?: string;
  //
  useDrawer?: boolean;
  //
  rightAction?: () => void;
  RightActionIcon?: LucideIcon;
  showNavbar?: boolean;
  children: React.ReactNode;
}

export const MainLayout = ({
  title,
  subTitle,
  useDrawer = false,
  rightAction,
  RightActionIcon,
  children,
  showNavbar = true,
}: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {showNavbar && (
        <Navbar
          title={title}
          useDrawer={useDrawer}
          rightAction={rightAction}
          RightActionIcon={RightActionIcon}
        />
      )}

      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
  },
});
