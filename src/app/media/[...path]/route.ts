import { readUpload } from "@/lib/upload";

// Sirve las imágenes públicas (rifas y ganadores). Los comprobantes están en otra carpeta y no salen por aquí.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join("/");
  try {
    const { data, mime } = await readUpload(`public/${rel}`);
    return new Response(new Uint8Array(data), {
      headers: { "content-type": mime, "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
