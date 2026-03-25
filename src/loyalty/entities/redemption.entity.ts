export interface Redemption {
  redemptionId: string; // Unique redemption identifier (UUID v4)
  userId: string; // User who redeemed points
  points: number; // Points redeemed (integer, > 0)
  timestamp: Date; // When redemption occurred
}
