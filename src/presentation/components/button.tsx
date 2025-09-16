import { ComponentStyles } from '@styles/components';
import { LucideIcon } from 'lucide-react-native';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';

interface Props extends TouchableOpacityProps {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;

  LeftIcon?: LucideIcon;
  RightIcon?: LucideIcon;
}

//TODO: param to configure style
//TODO: param to configure severity

export const Button = ({
  label,
  onPress,
  isDisabled = false,
  isLoading = false,
  LeftIcon,
  RightIcon,
  ...rest
}: Props) => {
  const RenderLeftIcon = () => {
    if (LeftIcon) {
      return <LeftIcon color={'white'} />;
    }
  };
  const RenderRightIcon = () => {
    if (RightIcon) {
      return <RightIcon color={'white'} />;
    }
  };

  return (
    <TouchableOpacity
      {...rest}
      style={[ComponentStyles.btnPrimary, rest.style]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}
        >
          {RenderLeftIcon()}
          <Text style={ComponentStyles.btnPrimaryText}>{label}</Text>
          {RenderRightIcon()}
        </View>
      )}
    </TouchableOpacity>
  );
};
