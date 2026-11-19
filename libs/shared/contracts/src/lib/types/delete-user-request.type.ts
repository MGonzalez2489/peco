/** Account deletion body; the password confirms that the owner authorized it (8.7). */
export interface DeleteUserRequest {
  password: string;
}
