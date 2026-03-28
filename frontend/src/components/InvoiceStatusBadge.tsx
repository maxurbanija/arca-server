interface InvoiceStatusBadgeProps {
  resultado?: string | null;
}

export default function InvoiceStatusBadge({ resultado }: InvoiceStatusBadgeProps) {
  if (resultado === 'A') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        Aprobado
      </span>
    );
  }

  if (resultado === 'R') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        Rechazado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
      Pendiente
    </span>
  );
}
