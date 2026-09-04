import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import { Button } from '@/components/button';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'UI/Card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Starter template</CardTitle>
        <CardDescription>Shared UI powered by shadcn-ui.</CardDescription>
      </CardHeader>
      <CardContent>
        Build consistent interfaces across apps and packages.
      </CardContent>
      <CardFooter>
        <Button size="sm">Learn more</Button>
      </CardFooter>
    </Card>
  ),
};

export const Dark: Story = {
  globals: { theme: 'dark' },
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Dark theme</CardTitle>
        <CardDescription>
          Card tokens remain readable in dark mode.
        </CardDescription>
      </CardHeader>
      <CardContent>Theme-aware surfaces and text.</CardContent>
    </Card>
  ),
};

export const SemanticColors: Story = {
  render: () => (
    <div className="grid gap-3" aria-label="Semantic color inventory">
      <div className="rounded-md bg-background p-3 text-foreground">
        Background
      </div>
      <div className="rounded-md bg-card p-3 text-card-foreground">Card</div>
      <div className="rounded-md bg-muted p-3 text-muted-foreground">Muted</div>
      <div className="rounded-md bg-accent p-3 text-accent-foreground">
        Accent
      </div>
      <div className="rounded-md bg-destructive p-3 text-destructive-foreground">
        Destructive
      </div>
    </div>
  ),
};
