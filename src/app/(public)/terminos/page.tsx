import type { Metadata } from "next";
import { site } from "@/lib/config";

export const metadata: Metadata = { title: "Términos y condiciones" };

// Plantilla base: revísala con un abogado y ajústala a tu permiso antes de publicar.
const sections: [string, string][] = [
  ["Organizador", `Las rifas publicadas en este sitio son organizadas por ${site.legalName || site.name}${site.permit ? `, con permiso ${site.permit}` : ""}.`],
  ["Participantes", "Solo pueden participar personas mayores de 18 años residentes en República Dominicana. Cada participante es responsable de que sus datos (nombre y teléfono) sean correctos."],
  ["Compra de boletos", "La compra se completa al subir el comprobante de una transferencia por el monto exacto. Los boletos se confirman únicamente cuando validamos el pago. Los números se asignan al azar y no se pueden elegir."],
  ["Pagos rechazados", "Si un comprobante no corresponde a una transferencia recibida, está incompleto o es ilegible, el pedido se rechaza y no se asignan números. Te contactaremos por WhatsApp."],
  ["Premios instantáneos", "Si una rifa tiene números premiados y uno de ellos se te asigna, ganas ese premio al momento de la aprobación. Ese boleto sigue participando por el premio mayor."],
  ["Fecha del sorteo", "Cada rifa indica su fecha o el porcentaje de venta con el que se anunciará. Podemos posponer el sorteo con aviso público si no se alcanza la meta de venta."],
  ["Sorteo", "El sorteo se realiza con el método indicado en la página de la rifa. Cuando es verificable, publicamos antes la huella SHA-256 de la semilla y la revelamos después, junto con la lista de números vendidos."],
  ["Entrega de premios", "El ganador debe presentar su cédula y el teléfono registrado. Los premios se entregan en un plazo máximo de 30 días. Los impuestos que correspondan por ley son responsabilidad del ganador, salvo que la rifa indique otra cosa."],
  ["Reembolsos", "Los boletos aprobados no son reembolsables, salvo cancelación de la rifa por parte del organizador, en cuyo caso se devuelve el monto pagado."],
  ["Privacidad", "Usamos tus datos solo para gestionar tu participación y contactarte. Publicamos el nombre de los ganadores de forma abreviada. No vendemos tus datos."],
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Términos y condiciones</h1>
      <div className="mt-8 space-y-6">
        {sections.map(([t, d], i) => (
          <section key={t}>
            <h2 className="font-semibold text-white">{i + 1}. {t}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
