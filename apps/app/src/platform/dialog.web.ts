export async function confirm(message: string): Promise<boolean> {
  return window.confirm(message);
}

export async function choose(message: string, options: [string, string]): Promise<0 | 1 | null> {
  if (window.confirm(`${message}\n\nOK = ${options[0]}`)) return 0;
  if (window.confirm(`${options[1]} ?`)) return 1;
  return null;
}

export function notify(message: string): void {
  window.alert(message);
}
