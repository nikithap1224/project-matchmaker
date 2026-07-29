import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, description, required_roles, status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Project Matchmaker</h1>
        {user ? (
          <Link href="/post-idea">+ Post an idea</Link>
        ) : (
          <Link href="/login">Sign in</Link>
        )}
      </div>

      {user && <p>Signed in as {user.email}</p>}

      <h2 style={{ marginTop: '2rem' }}>Projects</h2>

      {error && <p>Error loading projects: {error.message}</p>}

      {projects && projects.length === 0 && <p>No projects yet — be the first to post one.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {projects?.map((project) => (
          <Link
            key={project.id}
            href={`/project/${project.id}`}
            style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', textDecoration: 'none', color: 'inherit' }}
          >
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              Status: {project.status} · Roles needed: {project.required_roles?.join(', ') || 'Not specified'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}