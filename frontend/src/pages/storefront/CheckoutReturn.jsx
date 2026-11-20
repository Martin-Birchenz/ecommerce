import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, ArrowLeft } from "lucide-react";

export default function CheckoutReturn() {
  const { slug, status } = useParams();
  const [searchParams] = useSearchParams();
  const externalReference = searchParams.get("external_reference");

  const config = {
    success: {
      icon: CheckCircle2,
      color: "text-emerald-600",
      title: "¡Pago acreditado con éxito!",
      desc: "Tu pedido ya fue confirmado y el comercio comenzó a prepararlo.",
    },
    pending: {
      icon: Clock,
      color: "text-amber-500",
      title: "Pago pendiente de acreditación",
      desc: "Apenas Mercado Pago confirme la operación, tu pedido pasará a preparación.",
    },
    failure: {
      icon: XCircle,
      color: "text-red-600",
      title: "El pago no pudo completarse",
      desc: "No se realizó ningún cargo. Podés volver a la tienda e intentar nuevamente.",
    },
  }[status] || {
    icon: CheckCircle2,
    color: "text-slate-700",
    title: "Estado del pedido",
    desc: "Gracias por operar con nuestra tienda online.",
  };

  const Icon = config.icon;

  return (
    <div className="max-w-md mx-auto my-12 bg-white border rounded-2xl p-8 text-center shadow-xs space-y-4">
      <Icon className={`w-14 h-14 mx-auto ${config.color}`} />
      <h1 className="text-xl font-extrabold text-slate-900">{config.title}</h1>
      {externalReference && (
        <p className="text-xs font-mono bg-slate-100 inline-block px-3 py-1 rounded-full text-slate-700">
          Referencia: {externalReference}
        </p>
      )}
      <p className="text-sm text-slate-600">{config.desc}</p>

      <div className="pt-3">
        <Link
          to={`/t/${slug}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
