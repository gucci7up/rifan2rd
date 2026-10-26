# Rifan2 RD

Plataforma de rifas para República Dominicana: catálogo, compra con comprobante de transferencia, premios
instantáneos, verificador de boletos, sorteo verificable (commit-reveal) y panel de administración.

**Stack:** Next.js 15 (App Router) · PostgreSQL · Prisma 6 · Tailwind CSS 4 · Docker (Dokploy).

## Despliegue en Dokploy

1. **Sube el código a un repositorio Git** (GitHub, GitLab o Gitea).
2. **Crea la base de datos:** en tu proyecto de Dokploy → *Create Service → Database → PostgreSQL*.
   Cuando esté corriendo, copia la **Internal Connection URL**.
3. **Crea la aplicación:** *Create Service → Application* → conecta el repositorio y la rama.
   - *Build Type:* **Dockerfile** (ruta `./Dockerfile`).
4. **Variables de entorno** (pestaña *Environment*), basadas en [.env.example](.env.example):
   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La Internal Connection URL del paso 2 |
   | `ADMIN_USER` / `ADMIN_PASSWORD` | Acceso al panel `/admin` (usa una clave larga) |
   | `SESSION_SECRET` | Texto aleatorio de 32+ caracteres (`openssl rand -hex 32`) |
   | `SITE_URL` | `https://tudominio.com` (sin barra final) |
   | `SITE_NAME`, `WHATSAPP`, `INSTAGRAM`, `LEGAL_NAME`, `PERMIT` | Datos públicos del sitio |
   | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Opcional: captcha de Cloudflare |
5. **Volumen para los archivos subidos** (pestaña *Advanced → Volumes/Mounts*):
   *Volume Mount* con ruta de montaje **`/app/uploads`**. Sin esto, los comprobantes e imágenes se pierden en cada despliegue.
6. **Dominio** (pestaña *Domains*): agrega tu dominio, puerto **3000**, y activa HTTPS (Let's Encrypt).
7. **Deploy.** Al arrancar, el contenedor aplica las migraciones (`prisma migrate deploy`) y luego inicia el servidor.

Después entra a `https://tudominio.com/admin` y:
1. En **Bancos y categorías**, agrega tus cuentas bancarias y categorías.
2. En **Rifas → Nueva rifa**, crea la rifa, sube la imagen y guárdala como *Activa*.
3. En la rifa, agrega **paquetes** (ej. `10 = 300 *`) y **números premiados** (ej. `11111 = RD$7,500`).

> Si quieres datos de ejemplo, abre la terminal del contenedor en Dokploy y ejecuta `npx tsx prisma/seed.ts`
> (requiere instalar tsx) o créalos desde el panel.

## Flujo de una compra

1. El cliente elige paquete o cantidad, llena sus datos, elige el banco y sube el comprobante.
2. Se crea un pedido **pendiente** con código (ej. `P8DGFX7T`); los boletos quedan reservados (no hay sobreventa).
3. En **Pedidos**, el administrador ve el comprobante y aprueba o rechaza.
4. Al aprobar se asignan números **al azar** (sin repetir); si alguno es premiado, se registra el ganador instantáneo.
5. El cliente consulta su pedido en `/pedido/<código>` o en `/verificar`.

## Sorteo verificable

Al activar una rifa se genera una semilla secreta y se publica su hash SHA-256. Al sortear se revela la semilla y el
ganador es `HMAC-SHA256(semilla, "<id>:<cantidad>") mod cantidad` sobre los números vendidos ordenados. La página
`/rifas/<slug>/sorteo` explica cómo comprobarlo y ofrece la lista de números. También se puede registrar un número
ganador manual (por ejemplo, de la lotería en vivo).

## Desarrollo local (opcional)

```bash
cp .env.example .env   # pon un DATABASE_URL de Postgres
npm install
npx prisma migrate deploy
npm run db:seed        # datos de ejemplo
npm run dev
```

## Pasarelas de pago

`src/lib/payments.ts` define la interfaz `PaymentProvider`. Para tarjetas (Azul, CardNet, Stripe), implementa un
proveedor y llama a `approveOrder()` desde su webhook al confirmar el pago.
