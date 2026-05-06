export interface NotificationPolicyInput {
  durationMs: number;
  minReplySeconds: number;
  notifyOnlyWhenAppInBackground: boolean;
  isAppFocused?: boolean | null;
}

export function shouldSendReplyNotification(input: NotificationPolicyInput): boolean {
  if (input.durationMs < input.minReplySeconds * 1000) {
    return false;
  }

  if (input.notifyOnlyWhenAppInBackground && input.isAppFocused === true) {
    return false;
  }

  return true;
}
