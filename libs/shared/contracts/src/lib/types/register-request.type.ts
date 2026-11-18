/** Registration body; `email` is normalized by the API before use (8.6). */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
