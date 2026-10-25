/** Mirrors `digicamwm_core::DesignInfo`. */
export interface DesignInfo {
  id: string;
  name: string;
  description: string;
}

/** Mirrors `digicamwm_core::PhotoMeta` (camelCase). */
export interface PhotoMeta {
  make: string;
  model: string;
  lens: string;
  focalLength: number | null;
  fNumber: number | null;
  exposureTime: number | null;
  iso: number | null;
  takenAt: string | null;
}

/** A photo the user picked; bytes are read lazily (folders can hold hundreds). */
export interface PhotoSource {
  name: string;
  read(): Promise<Uint8Array>;
}
