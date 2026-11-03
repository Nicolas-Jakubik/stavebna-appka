import { redirect } from 'next/navigation'

// Finance is disabled in the interface. Existing finance database rows and
// original finance code remain recoverable from Git history.
export default function FinanciePage() {
  redirect('/dashboard')
}
