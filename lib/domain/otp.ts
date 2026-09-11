export function resendState({
  lastSentAt,
  now,
  cooldownSeconds,
}: {
  lastSentAt: number | null;
  now: number;
  cooldownSeconds: number;
}): { canResend: boolean; secondsLeft: number } {
  if (lastSentAt === null) return { canResend: true, secondsLeft: 0 };
  const elapsedMs = now - lastSentAt;
  const remainingMs = cooldownSeconds * 1000 - elapsedMs;
  if (remainingMs <= 0) return { canResend: true, secondsLeft: 0 };
  return { canResend: false, secondsLeft: Math.ceil(remainingMs / 1000) };
}
