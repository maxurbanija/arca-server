interface InvoiceStatusBadgeProps {
  resultado?: string | null;
}

export default function InvoiceStatusBadge({ resultado }: InvoiceStatusBadgeProps) {
  if (resultado === 'A') {
    return <span className="badge-green">Aprobada</span>;
  }

  if (resultado === 'R') {
    return <span className="badge-red">Rechazada</span>;
  }

  return <span className="badge-yellow">Pendiente</span>;
}
