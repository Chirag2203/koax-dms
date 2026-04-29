import { NewBuildWizard } from '@/src/components/custom-builds/new-flow/new-build-wizard';

/**
 * /custom-builds/new — Multi-step Create Build Job wizard.
 *
 * Steps: Customer → Vehicle → Details → Parts → Vendor → Review + Create
 * R10+ gate. On submit redirects to /custom-builds/[id].
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 P1.1 Issue 6
 */
export default function NewCustomBuildPage() {
  return <NewBuildWizard />;
}
