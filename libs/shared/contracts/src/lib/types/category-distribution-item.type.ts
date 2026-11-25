/** One category slice of a period distribution; amounts are integer cents (8.13). */
export interface CategoryDistributionItem {
  categoryPublicId: string;
  displayName: string;
  color: string | null;
  icon: string | null;
  amount: number;
  percentage: number;
}
