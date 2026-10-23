export type SceneKind = "photo" | "panorama" | "video" | "video360";
export type SceneLicense = "CC-BY-4.0" | "CC0-1.0";
export interface Scene {
  id: string; title: string; description: string; lat: number; lng: number;
  kind: SceneKind; url: string; device: string; license: SceneLicense;
  author: string; authorId: string; createdAt: string; source: "community";
  width?: number; height?: number; sourceUrl?: string; sourceAttribution?: string;
}
export interface SceneRow {
  id: string; title: string; description: string; lat: number; lng: number;
  kind: SceneKind; device: string; license: SceneLicense;
  author: string; author_id: string; created_at: string;
  width: number | null; height: number | null;
  object_key: string; mime_type: string; size_bytes: number; sha256: string;
  status: "published" | "deleted"; source_url: string | null; source_attribution: string | null;
}
