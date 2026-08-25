import Link from "next/link";

import styles from "./status.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p>404 · Lost in space</p>
      <h1>This page does not exist.</h1>
      <Link href="/">Return to Earth</Link>
    </main>
  );
}
