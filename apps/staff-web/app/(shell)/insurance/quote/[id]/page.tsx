import { SavedQuoteView } from '@/src/components/insurance/saved-quote-view';

interface Props {
  params: { id: string };
}

export default function SavedQuotePage({ params }: Props) {
  return <SavedQuoteView quoteId={params.id} />;
}
