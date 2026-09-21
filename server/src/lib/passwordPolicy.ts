/**
 * Passwords are hashed with argon2id and must be at least 12 characters (enforced by the validators).
 * On top of the length, reject the passwords attackers try first: well-known ones, with or without
 * trailing digits/symbols ("password1234"), single repeated characters and plain keyboard/number runs.
 */
const COMMON = new Set([
  'password', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'admin', 'administrator', 'administrateur', 'adminadmin', 'root', 'toor', 'welcome', 'letmein', 'login',
  'qwerty', 'qwertyuiop', 'qwertyuiopasdfgh', 'asdfghjkl', 'asdfghjklzxcvbnm', 'zxcvbnm', 'azertyuiop', 'iloveyou', 'monkey', 'dragon', 'football', 'baseball',
  'sunshine', 'princess', 'superman', 'batman', 'master', 'shadow', 'freedom', 'whatever', 'trustno1', 'starwars', 'hello', 'helloworld', 'changeme', 'changeit',
  'secret', 'secretpassword', 'mypassword', 'newpassword', 'defaultpassword', 'letmein123', 'abc', 'abcdef', 'abcdefgh', 'abcdefghijkl',
  'abcdefghijklmnop', 'passwordpassword', 'adminpassword', 'adminadminadmin', 'welcomewelcome', 'internet', 'computer', 'michael', 'jennifer', 'charlie', 'mustang',
  'lamico', 'lamicogroup', 'lamicogroupe', 'lamicoadmin', 'lamicopassword', 'alquds', 'alqudswater', 'palestine', 'falastin', 'jerusalem', 'nablus', 'nablus123',
  'kuwait', 'amman', 'ramallah', 'company', 'companyadmin', 'website', 'webmaster', 'sitepassword', 'databasepassword', 'postgres', 'postgresql', 'postgrespassword',
  'motdepasse', 'contrasena', 'kalimatalsir', 'matkhalayah',
]);

const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '0123456789012345', 'qwertyuiopasdfghjklzxcvbnm', '9876543210987654'];

const looksLikeRun = (s: string) => SEQUENCES.some((seq) => seq.includes(s) || [...seq].reverse().join('').includes(s));

/** Returns a short reason when the password is too weak, or null when it is acceptable. */
export function weakPasswordReason(password: string): string | null {
  const lower = password.toLowerCase();
  const letters = lower.replace(/[^a-z؀-ۿ]/g, ''); // ignore digits, symbols and spacing
  const base = lower.replace(/[\d\W_]+$/u, ''); // "password1234!" -> "password"
  const leet = lower.replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't');
  const leetBase = leet.replace(/[\d\W_]+$/u, '');

  if (new Set(lower).size <= 2) return 'Password is too repetitive';
  if (COMMON.has(lower) || COMMON.has(base) || COMMON.has(leetBase) || COMMON.has(letters)) return 'Password is too common';
  const alnum = lower.replace(/[^a-z0-9]/g, '');
  if (alnum.length >= 8 && looksLikeRun(alnum)) return 'Password is a simple sequence';
  return null;
}
