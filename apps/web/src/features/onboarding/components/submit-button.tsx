'use client';

import { Button } from '@mini-workout/ui';
import { useFormStatus } from 'react-dom';

export function SubmitButton({
  label = 'Create my starting plan',
}: {
  label?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="shrink-0 [text-transform:none] max-[480px]:w-full"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Saving…' : label}
    </Button>
  );
}
