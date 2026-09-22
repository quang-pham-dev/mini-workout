export function VerificationNotice({ hasError }: { hasError: boolean }) {
  return (
    <div className="mb-4 min-h-6">
      {hasError ? (
        <p role="alert">That verification link is invalid or expired.</p>
      ) : null}
    </div>
  );
}

export function VerificationNoticeSkeleton() {
  return <div aria-hidden="true" className="mb-4 min-h-6" />;
}
