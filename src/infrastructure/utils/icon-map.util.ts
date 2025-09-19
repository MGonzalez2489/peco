import { Coins, CreditCard, LucideIcon, PiggyBank, TriangleAlert } from 'lucide-react-native';

const DEFAULT_ICON = TriangleAlert;

const ICON_COMPONENT_MAP: Record<string, LucideIcon> = {
  card: CreditCard,
  wallet: PiggyBank,
  coin: Coins,
};

export const getIconComponent = (key: string): LucideIcon => {
  const normalizedKey = key.toLocaleLowerCase();
  return ICON_COMPONENT_MAP[normalizedKey] || DEFAULT_ICON;
};
