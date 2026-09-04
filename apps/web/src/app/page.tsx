import { Button } from '@mini-workout/ui/button';
import Image, { type ImageProps } from 'next/image';
import { Suspense } from 'react';

type Props = Omit<ImageProps, 'src'> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, className, ...rest } = props;

  return (
    <>
      <Image
        {...rest}
        src={srcLight}
        className={`block dark:hidden ${className ?? ''}`}
      />
      <Image
        {...rest}
        src={srcDark}
        className={`hidden dark:block ${className ?? ''}`}
      />
    </>
  );
};

export default function Home() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <div className="grid min-h-[100svh] grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-20 [font-synthesis:none] max-[600px]:p-8 max-[600px]:pb-20">
        <main className="row-start-2 flex flex-col gap-8 max-[600px]:items-center [&_ol]:m-0 [&_ol]:list-inside [&_ol]:p-0 [&_ol]:[font-family:var(--font-geist-mono)] [&_ol]:text-sm [&_ol]:leading-6 [&_ol]:tracking-[-0.01em] max-[600px]:[&_*:is(ol)]:text-center [&_ol_li:not(:last-of-type)]:mb-2 [&_code]:rounded [&_code]:bg-[rgba(0,0,0,0.05)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:[font-family:var(--font-geist-mono)] [&_code]:font-semibold">
          <ThemeImage
            className="h-auto"
            srcLight="turborepo-dark.svg"
            srcDark="turborepo-light.svg"
            alt="Turborepo logo"
            width={180}
            height={38}
            priority
          />
          <ol>
            <li>
              Get started by editing <code>apps/web/app/page.tsx</code>
            </li>
            <li>Save and see your changes instantly.</li>
          </ol>

          <div className="flex gap-4 max-[600px]:flex-col">
            <a
              className="flex h-12 items-center justify-center gap-2 rounded-[128px] border border-transparent px-5 [font-family:var(--font-geist-sans)] text-base font-medium leading-5 transition-[background,color,border-color] duration-200 pointer-fine:hover:border-transparent pointer-fine:hover:bg-[#383838] max-[600px]:h-10 max-[600px]:px-4 max-[600px]:text-sm"
              href="https://vercel.com/new/clone?demo-description=Learn+to+implement+a+monorepo+with+a+two+Next.js+sites+that+has+installed+three+local+packages.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F4K8ZISWAzJ8X1504ca0zmC%2F0b21a1c6246add355e55816278ef54bc%2FBasic.png&demo-title=Monorepo+with+Turborepo&demo-url=https%3A%2F%2Fexamples-basic-web.vercel.sh%2F&from=templates&project-name=Monorepo+with+Turborepo&repository-name=monorepo-turborepo&repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fturborepo%2Ftree%2Fmain%2Fexamples%2Fbasic&root-directory=apps%2Fdocs&skippable-integrations=1&teamSlug=vercel&utm_source=create-turbo"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className="dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={20}
                height={20}
              />
              Deploy now
            </a>
            <a
              href="https://turborepo.dev/docs?utm_source"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 min-w-[180px] items-center justify-center rounded-[128px] border border-[rgba(0,0,0,0.08)] px-5 [font-family:var(--font-geist-sans)] text-base font-medium leading-5 text-inherit no-underline transition-[background,color,border-color] duration-200 pointer-fine:hover:border-transparent pointer-fine:hover:bg-[#f2f2f2] max-[600px]:h-10 max-[600px]:min-w-0 max-[600px]:px-4 max-[600px]:text-sm"
            >
              Read our docs
            </a>
          </div>
          <Button className="flex h-12 min-w-[180px] items-center justify-center rounded-[128px] border border-[rgba(0,0,0,0.08)] bg-transparent px-5 [font-family:var(--font-geist-sans)] text-base font-medium leading-5 transition-[background,color,border-color] duration-200 pointer-fine:hover:border-transparent pointer-fine:hover:bg-[#f2f2f2] max-[600px]:h-10 max-[600px]:min-w-0 max-[600px]:px-4 max-[600px]:text-sm">
            Open alert
          </Button>
        </main>
        <footer className="row-start-3 flex gap-6 [font-family:var(--font-geist-sans)] max-[600px]:flex-wrap max-[600px]:items-center max-[600px]:justify-center [&_a]:flex [&_a]:items-center [&_a]:gap-2 [&_a:hover]:underline [&_a:hover]:underline-offset-4">
          <a
            href="https://vercel.com/templates?search=turborepo&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              aria-hidden
              src="/window.svg"
              alt="Window icon"
              width={16}
              height={16}
            />
            Examples
          </a>
          <a
            href="https://turborepo.dev?utm_source=create-turbo"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              aria-hidden
              src="/globe.svg"
              alt="Globe icon"
              width={16}
              height={16}
            />
            Go to turborepo.dev →
          </a>
        </footer>
      </div>
    </Suspense>
  );
}
