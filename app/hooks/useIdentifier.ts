import { useSyncExternalStore } from "react";
import {
    subscribeToIdentifier,
    getStoredSnapshot,
    getServerSnapshot,
} from "../utils/identifierStorage";

const emptySubscribe = () => () => { };

export function useIsHydrated(): boolean {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );
}

export function useStoredIdentifier(): string | null {
    return useSyncExternalStore(
        subscribeToIdentifier,
        getStoredSnapshot,
        getServerSnapshot
    );
}