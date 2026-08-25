"use client";

import styles from "./status.module.css";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className={styles.page}>
      <p>Something interrupted the journey.</p>
      <h1>Earth could not be displayed.</h1>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
