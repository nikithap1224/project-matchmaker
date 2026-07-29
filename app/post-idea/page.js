import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'    
import { logAction } from '@/lib/log'
import { revalidatePath } from 'next/cache'

export default async function PostIdeaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function createProject(formData) {
    'use server'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const title = formData.get('title')
    const description = formData.get('description')
    const rolesRaw = formData.get('required_roles')
    const required_roles = rolesRaw
      ? rolesRaw.split(',').map((r) => r.trim()).filter(Boolean)
      : []

    const { error } = await supabase.from('projects').insert({
      owner_id: user.id,
      title,
      description,
      required_roles
    })

    if (error) {
      console.error(error)
      return
    }

    await logAction(user.id, 'created_project')
    
    redirect('/')
  }
  
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Post a new idea</h1>
      <form action={createProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Title
          <input name="title" required style={{ display: 'block', width: '100%', padding: '0.5rem' }} />
        </label>
        <label>
          Description
          <textarea name="description" required rows={4} style={{ display: 'block', width: '100%', padding: '0.5rem' }} />
        </label>
        <label>
          Required roles (comma-separated)
          <input name="required_roles" placeholder="e.g. Frontend, Backend, Designer" style={{ display: 'block', width: '100%', padding: '0.5rem' }} />
        </label>
        <button type="submit">Post idea</button>
      </form>
    </div>
  )
}