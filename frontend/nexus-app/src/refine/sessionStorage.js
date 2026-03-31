export const REMEMBER_ME_KEY = "nexus:remember-me";
export const REMEMBERED_USERNAME_KEY = "nexus:remembered-username";
export const REMEMBER_ME_NOTICE_KEY = "nexus:remember-me-notice";

const getStorage = (storageType) => {
  if (typeof window === "undefined") {
    return null;
  }

  return storageType === "local" ? window.localStorage : window.sessionStorage;
};

export function getPrimarySessionStorage({ rememberMe = false } = {}) {
  return getStorage(rememberMe ? "local" : "session");
}

export function getSecondarySessionStorage({ rememberMe = false } = {}) {
  return getStorage(rememberMe ? "session" : "local");
}

export function getSessionValue(key) {
  const sessionStorageRef = getStorage("session");
  const localStorageRef = getStorage("local");

  return (
    sessionStorageRef?.getItem(key) ??
    localStorageRef?.getItem(key) ??
    null
  );
}

export function hasSessionValue(key) {
  return Boolean(getSessionValue(key));
}

export function setSessionValue(key, value, { rememberMe = false } = {}) {
  const primaryStorage = getPrimarySessionStorage({ rememberMe });
  const secondaryStorage = getSecondarySessionStorage({ rememberMe });

  if (!primaryStorage) {
    return;
  }

  if (value === undefined || value === null || value === "") {
    primaryStorage.removeItem(key);
  } else {
    primaryStorage.setItem(key, String(value));
  }

  secondaryStorage?.removeItem(key);
}

export function clearSessionValue(key) {
  getStorage("local")?.removeItem(key);
  getStorage("session")?.removeItem(key);
}

export function setRememberedLogin(username, rememberMe) {
  const localStorageRef = getStorage("local");

  if (!localStorageRef) {
    return;
  }

  if (rememberMe) {
    localStorageRef.setItem(REMEMBER_ME_KEY, "true");
    if (username) {
      localStorageRef.setItem(REMEMBERED_USERNAME_KEY, username);
    }
    return;
  }

  localStorageRef.removeItem(REMEMBER_ME_KEY);
  localStorageRef.removeItem(REMEMBERED_USERNAME_KEY);
}

export function getRememberedLogin() {
  const localStorageRef = getStorage("local");

  return {
    rememberMe: localStorageRef?.getItem(REMEMBER_ME_KEY) === "true",
    username: localStorageRef?.getItem(REMEMBERED_USERNAME_KEY) || "",
  };
}

export function queueRememberedLoginNotice() {
  getStorage("session")?.setItem(REMEMBER_ME_NOTICE_KEY, "pending");
}

export function consumeRememberedLoginNotice() {
  const sessionStorageRef = getStorage("session");

  if (sessionStorageRef?.getItem(REMEMBER_ME_NOTICE_KEY) !== "pending") {
    return false;
  }

  sessionStorageRef.removeItem(REMEMBER_ME_NOTICE_KEY);
  return true;
}
