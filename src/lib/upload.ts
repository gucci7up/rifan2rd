import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// En Dokploy monta un volumen persistente en esta ruta (por defecto /app/uploads).
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "uploads");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const TYPES = {
  jpg: { mime: "image/jpeg", test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { mime: "image/png", test: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  webp: { mime: "image/webp", test: (b: Buffer) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  pdf: { mime: "application/pdf", test: (b: Buffer) => b.toString("ascii", 0, 5) === "%PDF-" },
} as const;

export type UploadKind = keyof typeof TYPES;

export function mimeFor(file: string): string {
  const ext = path.extname(file).slice(1) as UploadKind;
  return TYPES[ext]?.mime ?? "application/octet-stream";
}

/**
 * Guarda un archivo validando su contenido real (no la extensión que manda el navegador).
 * `folder` es "receipts" (privado) o "public" (servido en /media).
 */
export async function saveUpload(
  file: File,
  folder: "receipts" | "public",
  allowed: UploadKind[],
): Promise<string> {
  if (file.size === 0) throw new Error("El archivo está vacío.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("El archivo supera los 10 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = allowed.find((k) => TYPES[k].test(buf));
  if (!kind) throw new Error(`Formato no permitido. Usa: ${allowed.join(", ").toUpperCase()}.`);

  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${kind}`;
  await writeFile(path.join(dir, name), buf);
  return `${folder}/${name}`;
}

/** Lee un archivo subido evitando path traversal. */
export async function readUpload(relPath: string) {
  const full = path.resolve(UPLOAD_DIR, relPath);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) throw new Error("Ruta inválida");
  return { data: await readFile(full), mime: mimeFor(full) };
}
