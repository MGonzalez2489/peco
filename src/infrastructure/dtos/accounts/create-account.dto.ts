export interface CreateAccountDto {
  name: string;
  accountTypeId: string;
  balance: number;

  bank?: string;
  accountNumber?: string;
}
