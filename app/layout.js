import './globals.css'
import ThemeToggle from './themeToggle'

export const metadata = {
  title: 'Project Matchmaker',
  description: 'ACM WebDev Induction project',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <ThemeToggle />
          </div>
          {children}
        </div>
      </body>
    </html>
  )
}