/** Public user shape returned by every authenticated endpoint (8.7). */
export interface UserResponse {
  publicId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
