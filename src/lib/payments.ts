// Punto de extensión para pasarelas de pago.
// Hoy solo existe "transfer" (comprobante + aprobación manual). Para agregar Azul, CardNet o Stripe,
// implementa PaymentProvider, regístralo en `providers` y llama a approveOrder() desde su webhook
// cuando el pago se confirme.

export interface PaymentProvider {
  id: string;
  label: string;
  /** true si el pago se confirma solo (webhook) y no necesita comprobante. */
  automatic: boolean;
  enabled(): boolean;
}

const transfer: PaymentProvider = {
  id: "transfer",
  label: "Transferencia bancaria",
  automatic: false,
  enabled: () => true,
};

export const providers: PaymentProvider[] = [transfer];

export function enabledProviders() {
  return providers.filter((p) => p.enabled());
}
