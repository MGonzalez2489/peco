import { COLORS } from "@styles/colors";
import { icons } from "lucide-react-native";
interface Props {
  name: string;
  color?: string;
  size?: number;
}
//TODO: can the name be an enum value to have more icon control?
export const Icon = ({ name, color = COLORS.text, size = 15 }: Props) => {
  const LucideIcon = icons[name];
  return <LucideIcon color={color} size={size} />;
};
