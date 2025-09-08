export class ResultDto<T> {
  statusCode: boolean;
  data: T;
  isSuccess: boolean;
}
