/**
 * Response returned after successful authentication
 */
export interface AuthResponse {
  /**
   * JWT access token
   */
  accessToken: string;

  /**
   * User information
   */
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}
