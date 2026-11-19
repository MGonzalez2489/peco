/** Profile patch body; only `name` is mutable in v1 (8.7). */
export interface UpdateUserRequest {
  name?: string;
}
