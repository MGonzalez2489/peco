export class ResultListDto<T> {
  data: T[] = [];
  meta: PaginationMetaDto = new PaginationMetaDto();
}

export class PaginationMetaDto {
  page = 1;
  take = 10;
  itemCount = 0;
  pageCount = 0;
  hasPreviousPage = false;
  hasNextPage = false;
}
