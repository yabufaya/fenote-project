// One shared policy for first-time invite activation, password reset and any
// future password field. Supabase Auth stores the password hash; this app only
// validates and forwards the password.
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_HINT =
  `At least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number`;

export function passwordIssue(password, confirm) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Use at least one letter and one number.';
  }
  if (password !== confirm) return 'Passwords do not match.';
  return '';
}
