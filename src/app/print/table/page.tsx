import { redirect } from 'next/navigation';

/**
 * Legacy print route — QR printing is now handled directly from the
 * Tables & QR dashboard page via the "Save QR Image" / "Print Branded Tent" buttons.
 * This route simply redirects to the tables management page.
 */
export default function PrintTablePage() {
  redirect('/dashboard/tables');
}
