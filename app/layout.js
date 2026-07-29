export const metadata = {
  title: 'Project Matchmaker',
  description: 'ACM WebDev Induction project',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}