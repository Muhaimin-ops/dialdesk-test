'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton({ children, className = 'btn' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? 'Working…' : children}
    </button>
  );
}
