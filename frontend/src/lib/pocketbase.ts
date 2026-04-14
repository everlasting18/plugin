import PocketBase from "pocketbase";

export function createPocketBaseClient(pbUrl: string): PocketBase {
  return new PocketBase(pbUrl);
}

export function syncPocketBaseCookie(pb: PocketBase): void {
  document.cookie = pb.authStore.exportToCookie({
    httpOnly: false,
    sameSite: "Lax",
    secure: window.location.protocol === "https:",
    path: "/",
  });
}
