import { Entry } from "@domain/entities";

export interface GroupedEntriesDto {
  date: string;
  entries: Entry[];
}
