import { ComponentStyles } from "@styles/components";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
}

//TODO: param to configure style
//TODO: param to configure severity

export const Button = ({
  label,
  onPress,
  isDisabled = false,
  isLoading = false,
}) => {
  return (
    <TouchableOpacity
      style={ComponentStyles.btnPrimary}
      onPress={onPress}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={ComponentStyles.btnPrimaryText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};
