type SubmitButtonProps = {
  isPending: boolean;
  text: string;
  pendingText: string;
};

export function SubmitButton({
  isPending,
  text,
  pendingText,
}: SubmitButtonProps) {
  return (
    <button
      aria-busy={isPending}
      className="min-h-11 rounded-lg bg-primary font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      type="submit"
    >
      {isPending ? pendingText : text}
    </button>
  );
}
