export const SIGNUP_PROGRESS_STEPS: Record<number, number> = {
  1: 0,
  2: 25,
  3: 55,
  4: 62,
  5: 70,
  6: 85,
  7: 100,
};

export function getSignupProgressPercent(step: number) {
  return SIGNUP_PROGRESS_STEPS[step] ?? 0;
}

export function isSignupProgressVisible(step: number) {
  return step >= 2;
}
