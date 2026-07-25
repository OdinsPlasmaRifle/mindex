/**
 * Full-height centred message, used for the loading and not-found states every
 * detail page shares.
 */
export default function PageMessage({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
      {children}
    </div>
  )
}
