import {
  type ConfigureUserInput,
  configureUser,
  testUsers,
} from './database.ts';
import { authStatePath } from './test.ts';

type AuthApi = {
  post: (
    path: string,
    options: { data: Record<string, unknown> },
  ) => Promise<{
    ok: () => boolean;
    status: () => number;
    text: () => Promise<string>;
  }>;
  storageState: (options: { path: string }) => Promise<unknown>;
  dispose: () => Promise<void>;
};

export async function prepareAuthState(
  api: AuthApi,
  databaseUrl: string,
  token: string,
  configure: typeof configureUser = configureUser,
): Promise<void> {
  try {
    for (const [name, user] of Object.entries(testUsers)) {
      const response = await api.post('/api/auth/sign-up/email', {
        data: { name: `${name} user`, ...user },
      });
      if (!response.ok())
        throw new Error(
          `E2E setup could not register ${user.email}: ${response.status()} ${(
            await response.text()
          ).slice(0, 500)}`,
        );
      const configurations: Record<keyof typeof testUsers, ConfigureUserInput> =
        {
          active: {
            onboardingCompleted: true,
            experienceLevel: 'INTERMEDIATE',
            interestSlugs: ['strength', 'hiit'],
            favoriteWorkoutSlugs: ['the-20-minute-reset'],
            likeWorkoutSlugs: ['the-20-minute-reset'],
          },
          empty: {
            onboardingCompleted: true,
            experienceLevel: 'BEGINNER',
            interestSlugs: ['mobility'],
          },
          newUser: { onboardingCompleted: false },
          admin: {
            onboardingCompleted: true,
            experienceLevel: 'INTERMEDIATE',
            interestSlugs: ['strength'],
            role: 'ADMIN',
          },
          member: {
            onboardingCompleted: true,
            experienceLevel: 'BEGINNER',
            interestSlugs: ['mobility'],
            role: 'MEMBER',
          },
        };
      const configuration = configurations[name as keyof typeof testUsers];
      await configure(databaseUrl, user.email, configuration);
      const signIn = await api.post('/api/auth/sign-in/email', {
        data: { email: user.email, password: user.password, rememberMe: true },
      });
      if (!signIn.ok())
        throw new Error(
          `E2E setup could not sign in ${user.email}: ${signIn.status()} ${(
            await signIn.text()
          ).slice(0, 500)}`,
        );
      await api.storageState({
        path: authStatePath(
          name === 'newUser' ? 'new-user' : name,
          databaseUrl,
          token,
        ),
      });
    }
  } catch (error) {
    await api.dispose().catch(() => undefined);
    throw error;
  }
  await api.dispose();
}
