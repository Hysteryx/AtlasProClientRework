const STORAGE_KEY = "atlas_client_identifier";

export function isValidIdentifier(val: string): boolean {
    return /^\d+$/.test(val);
}

const listeners = new Set<() => void>();

function emitStorageChange() {
    for (const listener of listeners) {
        listener();
    }
}

export function subscribeToIdentifier(callback: () => void) {
    listeners.add(callback);
    if (typeof window !== "undefined") {
        window.addEventListener("storage", callback);
    }
    return () => {
        listeners.delete(callback);
        if (typeof window !== "undefined") {
            window.removeEventListener("storage", callback);
        }
    };
}

export function getStoredSnapshot(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const trimmed = raw.trim();
        if (isValidIdentifier(trimmed)) {
            return trimmed;
        }
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
    } catch {
        return null;
    }
}

export function getServerSnapshot(): string | null {
    return null;
}

export function persistIdentifier(identifier: string): boolean {
    if (typeof window === "undefined") return false;
    try {
        window.localStorage.setItem(STORAGE_KEY, identifier);
        emitStorageChange();
        return true;
    } catch (err) {
        console.error("Failed to store identifier locally:", err);
        return false;
    }
}

export function clearStoredIdentifier(): boolean {
    if (typeof window === "undefined") return false;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
        emitStorageChange();
        return true;
    } catch (err) {
        console.error("Failed to clear identifier:", err);
        return false;
    }
}