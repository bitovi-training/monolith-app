/**
 * User Entity
 * 
 * Represents a user in the system with authentication credentials and profile information.
 */
export interface User {
  /**
   * Unique user identifier
   */
  id: string;

  /**
   * User's email address (used as username for login)
   */
  email: string;

  /**
   * Hashed password (never expose in responses)
   */
  passwordHash: string;

  /**
   * Array of role identifiers assigned to the user
   * @example ["user", "admin"]
   */
  roles: string[];

  /**
   * Timestamp when the user was created
   */
  createdAt: Date;

  /**
   * Timestamp of last update
   */
  updatedAt: Date;
}
