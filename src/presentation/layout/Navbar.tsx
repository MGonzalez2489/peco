import { MainDrawerParams } from '@presentation/navigation';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '@styles/colors';
import { ChevronLeft, LucideIcon, TextAlignJustify } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  title: string;
  useDrawer?: boolean;

  rightAction?: () => void;
  RightActionIcon?: LucideIcon;
}
export const Navbar = ({ title, useDrawer = false, rightAction, RightActionIcon }: Props) => {
  const { canGoBack, goBack } = useNavigation();
  const mainNavigation = useNavigation<DrawerNavigationProp<MainDrawerParams>>();

  const RenderRightAction = () => {
    if (rightAction === undefined || RightActionIcon === undefined) return null;

    return (
      <TouchableOpacity onPress={rightAction}>
        <RightActionIcon color={COLORS.primary} size={20} />
      </TouchableOpacity>
    );
  };

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
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {renderLeftOption()}
        <Text style={styles.title}>{title}</Text>
      </View>
      {RenderRightAction()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
