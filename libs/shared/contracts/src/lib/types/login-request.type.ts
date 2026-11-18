/** Login body; `email` is normalized by the API before lookup (8.6). */
export interface LoginRequest {
  email: string;
  password: string;
}
