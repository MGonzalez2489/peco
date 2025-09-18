import { Entry } from '@domain/entities';

export interface GroupedEntriesDto {
  title: string;
  data: Entry[];
}
