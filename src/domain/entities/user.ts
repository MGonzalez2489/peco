import { BaseEntity } from "./_base";

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  avatar: string;
}
