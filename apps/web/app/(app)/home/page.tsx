import { auth } from '../../../auth';
import { headers } from 'next/headers';

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main>
      <h1>Welcome{session?.user.name ? `, ${session.user.name}` : ''}</h1>
      <p>Your workout dashboard will be added in the next product step.</p>
      <form
        action={async () => {
          'use server';
          await auth.api.signOut({ headers: await headers() });
        }}
      >
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
