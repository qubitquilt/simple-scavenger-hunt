export const getUserId = (): string | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const name = "userId=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
};

export const setUserId = (userId: string, days = 1): void => {
  if (typeof document === "undefined") {
    return;
  }

  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `userId=${encodeURIComponent(userId)}; expires=${expires}; path=/; SameSite=Lax`;
};
