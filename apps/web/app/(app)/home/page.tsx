import { auth, signOut } from '../../../auth';

export default async function HomePage() {
  const session = await auth();

  return (
    <main>
      <h1>Welcome{session?.user.name ? `, ${session.user.name}` : ''}</h1>
      <p>Your workout dashboard will be added in the next product step.</p>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      >
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
