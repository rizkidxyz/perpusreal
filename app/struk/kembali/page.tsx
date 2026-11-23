import { ReceiptPage } from '@/components/receipt-page';

export const dynamic = 'force-dynamic';

export default async function StrukKembaliPage({
  searchParams,
}: {
  searchParams: Promise<{ codes?: string | string[]; kode?: string | string[] }>;
}) {
  const q = await searchParams;
  const raw = Array.isArray(q.codes) ? q.codes.join(',') : (q.codes || '');
  const codes = raw.split(',').map((c) => c.trim()).filter(Boolean);
  const kode = Array.isArray(q.kode) ? q.kode[0] : q.kode;
  return <ReceiptPage type="kembali" codes={codes} kode={kode} />;
}
