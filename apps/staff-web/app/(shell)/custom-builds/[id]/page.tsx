import { CustomBuildsDetailView } from '@/src/components/custom-builds/detail/custom-builds-detail-view';

/**
 * /custom-builds/[id] — Build Job detail with 6 tabs.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6
 */

interface PageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default function CustomBuildsDetailPage({ params, searchParams }: PageProps) {
  return (
    <CustomBuildsDetailView
      jobId={params.id}
      activeTab={searchParams.tab ?? 'overview'}
    />
  );
}
