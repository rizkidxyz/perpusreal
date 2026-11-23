import { ReceiptPage } from '@/components/receipt-page';

export const dynamic = 'force-dynamic';

export default async function StrukPinjamPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  return <ReceiptPage type="pinjam" group={group} />;
}
