'use client';

import { completeOnboarding } from './actions';
import styles from './onboarding-form.module.css';
import { Button } from '@mini-workout/ui/button';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';

type Interest = { id: string; name: string; slug: string };

const interestDescriptions: Record<string, string> = {
  cardio: 'Build your engine',
  flexibility: 'Make space to move',
  hiit: 'Short, focused effort',
  meditation: 'Find a quieter rhythm',
  mobility: 'Move with more ease',
  pilates: 'Strengthen with control',
  strength: 'Build everyday power',
  stretching: 'Unwind and reset',
  yoga: 'Breathe and flow',
};

const experienceLevels = [
  { value: 'BEGINNER', label: 'New to regular movement', title: 'Beginner' },
  {
    value: 'INTERMEDIATE',
    label: 'Building a steady rhythm',
    title: 'Intermediate',
  },
  { value: 'ADVANCED', label: 'Ready for a challenge', title: 'Advanced' },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className={styles.submitButton} type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Create my starting plan'}
    </Button>
  );
}

export function OnboardingForm({
  interests,
  hasError,
}: {
  interests: Interest[];
  hasError: boolean;
}) {
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    new Set(),
  );
  const [experienceLevel, setExperienceLevel] = useState('');

  function toggleInterest(id: string) {
    setSelectedInterests((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.intro} aria-labelledby="onboarding-title">
          <p className={styles.eyebrow}>Your starting line</p>
          <div className={styles.accentMark} aria-hidden="true" />
          <h1 className={styles.title} id="onboarding-title">
            A plan that feels like yours.
          </h1>
          <p className={styles.introCopy}>
            Tell us what you want more of. We’ll use it to shape a first week
            that fits your energy, not someone else’s routine.
          </p>
          <div className={styles.progress} aria-label="Onboarding progress">
            <span className={styles.progressActive}>01</span>
            <span className={styles.progressLine} />
            <span>02</span>
            <span className={styles.progressLabel}>Preferences next</span>
          </div>
        </section>

        <form action={completeOnboarding} className={styles.formPanel}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>What do you want more of?</legend>
            <p className={styles.helper}>Choose at least one focus.</p>
            <div className={styles.choiceGrid}>
              {interests.map((interest) => {
                const selected = selectedInterests.has(interest.id);
                return (
                  <label
                    className={`${styles.choice} ${selected ? styles.choiceSelected : ''}`}
                    key={interest.id}
                  >
                    <input
                      checked={selected}
                      className={styles.choiceInput}
                      name="interests"
                      onChange={() => toggleInterest(interest.id)}
                      type="checkbox"
                      value={interest.id}
                    />
                    <span className={styles.choiceText}>
                      <span className={styles.choiceTitle}>
                        {interest.name}
                      </span>
                      <span className={styles.choiceDescription}>
                        {interestDescriptions[interest.slug] ??
                          'Make it part of your week'}
                      </span>
                    </span>
                    <span className={styles.checkmark} aria-hidden="true">
                      ✓
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={styles.selectionCount} aria-live="polite">
              {selectedInterests.size === 0
                ? 'Nothing selected yet'
                : `${selectedInterests.size} focus${selectedInterests.size === 1 ? '' : 'es'} selected`}
            </p>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Set your pace</legend>
            <p className={styles.helper}>There is no wrong starting point.</p>
            <div className={styles.levelList}>
              {experienceLevels.map((level) => {
                const selected = experienceLevel === level.value;
                return (
                  <label
                    className={`${styles.levelChoice} ${selected ? styles.choiceSelected : ''}`}
                    key={level.value}
                  >
                    <input
                      checked={selected}
                      className={styles.choiceInput}
                      name="experienceLevel"
                      onChange={() => setExperienceLevel(level.value)}
                      type="radio"
                      value={level.value}
                    />
                    <span className={styles.radioMark} aria-hidden="true" />
                    <span className={styles.choiceText}>
                      <span className={styles.choiceTitle}>{level.title}</span>
                      <span className={styles.choiceDescription}>
                        {level.label}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {hasError && (
            <p className={styles.error} role="alert" aria-live="polite">
              Choose at least one focus and a pace to continue.
            </p>
          )}

          <div className={styles.submitRow}>
            <p className={styles.submitHint}>You can change these anytime.</p>
            <SubmitButton />
          </div>
        </form>
      </div>
    </main>
  );
}
