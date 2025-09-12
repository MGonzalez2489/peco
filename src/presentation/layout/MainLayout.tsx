import { COLORS } from "@styles/colors";
import { StyleSheet, View } from "react-native";
import { Navbar } from "./Navbar";

interface Props {
  title: string;
  subTitle?: string;
  //
  useDrawer?: boolean;
  //
  rightAction?: () => void;
  rightActionIcon?: string;
  children: React.ReactNode;
}

export const MainLayout = ({
  title,
  subTitle,
  useDrawer = false,
  rightAction,
  rightActionIcon,
  children,
}: Props) => {
  return (
    <View style={styles.container}>
      <Navbar title={title} useDrawer={useDrawer} />
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
