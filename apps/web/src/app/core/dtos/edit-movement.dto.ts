export interface EditMovementDTO {
  accountId: string;
  categoryId: string;
  /** Positive magnitude in integer cents; the direction comes from the movement type. */
  amount: number;
  note?: string;
  targetAccountId?: string;
}
