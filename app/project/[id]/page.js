import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { logAction } from '@/lib/log'

export default async function ProjectPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, title, description, required_roles, status, owner_id, created_at')
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  const isOwner = user?.id === project.owner_id

  // Owner: fetch applicants for this project
  let applications = []
  if (isOwner) {
    const { data } = await supabase
      .from('applications')
      .select('id, message, status, applicant_id, users(name, email)')
      .eq('project_id', id)
    applications = data || []
  }

  // Non-owner: check if this user already applied
  let existingApplication = null
  if (user && !isOwner) {
    const { data } = await supabase
      .from('applications')
      .select('id, status')
      .eq('project_id', id)
      .eq('applicant_id', user.id)
      .maybeSingle()
    existingApplication = data
  }

  async function applyToProject(formData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const message = formData.get('message')
    const { error } = await supabase.from('applications').insert({
      project_id: id,
      applicant_id: user.id,
      message
    })
    if (error) console.error(error)

    await logAction(user.id, 'applied_to_project')

    // Look up owner + applicant details for the notification
    const { data: owner } = await supabase
      .from('users')
      .select('email')
      .eq('id', project.owner_id)
      .single()

    const { data: applicant } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()

    console.log('owner:', owner)
    console.log('applicant:', applicant)

    const { error: fnError } = await supabase.functions.invoke('notify-owner', {
      body: {
        ownerEmail: owner?.email,
        applicantName: applicant?.name,
        projectTitle: project.title,
        pitch: message,
      },
    })

  if (fnError) {
      console.error('fnError:', fnError)
      if (fnError.context) {
        const errBody = await fnError.context.text()
        console.error('Edge function error body:', errBody)
      }
    }

    redirect(`/project/${id}`)
  }
  async function updateApplicationStatus(formData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const applicationId = formData.get('applicationId')
    const status = formData.get('status')

    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
    if (error) console.error(error)

    if (user) {
      await logAction(user.id, `application_${status.toLowerCase()}`)
    }

    redirect(`/project/${id}`)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <h1>{project.title}</h1>
      <p style={{ color: '#666' }}>
        Status: {project.status} · Roles needed: {project.required_roles?.join(', ') || 'Not specified'}
      </p>
      <p style={{ marginTop: '1rem' }}>{project.description}</p>

      {isOwner && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Applicants</h2>
          {applications.length === 0 && <p>No applications yet.</p>}
          {applications.map((app) => (
            <div key={app.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
              <p><strong>{app.users?.name || app.users?.email}</strong> — {app.status}</p>
              <p>{app.message}</p>
              {app.status === 'Pending' && (
                <form action={updateApplicationStatus} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="hidden" name="applicationId" value={app.id} />
                  <button formAction={async (fd) => { 'use server'; fd.set('status', 'Accepted'); await updateApplicationStatus(fd) }}>
                    Accept
                  </button>
                  <button formAction={async (fd) => { 'use server'; fd.set('status', 'Declined'); await updateApplicationStatus(fd) }}>
                    Decline
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {!isOwner && user && (
        <div style={{ marginTop: '2rem' }}>
          {existingApplication ? (
            <p>Your application status: <strong>{existingApplication.status}</strong></p>
          ) : (
            <form action={applyToProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                Pitch to join
                <textarea name="message" required rows={3} style={{ display: 'block', width: '100%', padding: '0.5rem' }} />
              </label>
              <button type="submit">Submit application</button>
            </form>
          )}
        </div>
      )}

      {!user && (
        <p style={{ marginTop: '2rem' }}>Sign in to apply to this project.</p>
      )}
    </div>
  )
}