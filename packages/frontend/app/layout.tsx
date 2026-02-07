export const metadata = {
  title: "Dialectical Engine",
  description: "Structured debate platform powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
