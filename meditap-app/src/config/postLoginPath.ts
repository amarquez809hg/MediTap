/** Path after successful sign-in (Ionic router). */
export function getPostLoginPath(): string {
  const raw = (import.meta.env.VITE_POST_LOGIN_PATH as string | undefined)?.trim();
  return raw || '/tab3';
}
