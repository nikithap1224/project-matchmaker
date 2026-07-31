import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { logAction } from '@/lib/log'
import DeleteProjectButton from './deleteProjectButton'
import { revalidatePath } from 'next/cache'

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
      .select('id, message, status, applicant_id, applicant_name, contact_info, role_applying_for, experience_link, availability, users(name, email)')
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
    const applicantName = formData.get('name') || null
    const contactInfo = formData.get('contact')
    const roleApplyingFor = formData.get('role')
    const experienceLink = formData.get('experience_link') || null
    const availability = formData.get('availability')

    const { error } = await supabase.from('applications').insert({
      project_id: id,
      applicant_id: user.id,
      message,
      applicant_name: applicantName,
      contact_info: contactInfo,
      role_applying_for: roleApplyingFor,
      experience_link: experienceLink,
      availability
    })
    if (error) console.error(error)

    await logAction(user.id, 'applied_to_project')

    // owner/applicant lookup + notify-owner invoke stays exactly as it is currently

    revalidatePath(`/project/${id}`)
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
      revalidatePath(`/project/${id}`)
      redirect(`/project/${id}`)
    if (user) {
      await logAction(user.id, `application_${status.toLowerCase()}`)
    }

    redirect(`/project/${id}`)
  }

  async function deleteProject(formData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) {
      console.error(error)
      return
    }

    await logAction(user.id, 'deleted_project')
    redirect('/')
  }

  async function withdrawApplication(formData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const applicationId = formData.get('applicationId')

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
    if (error) console.error(error)

    await logAction(user.id, 'withdrew_application')

    revalidatePath(`/project/${id}`)
    redirect(`/project/${id}`)
  }
  
  return (
    <div >
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
              <p><strong>{app.applicant_name || app.users?.name || app.users?.email}</strong> — {app.status}</p>
              <p>Applying for: {app.role_applying_for}</p>
              <p>Contact: {app.contact_info}</p>
              {app.experience_link && <p>Portfolio: <a href={app.experience_link} target="_blank">{app.experience_link}</a></p>}
              <p>Availability: {app.availability}</p>
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
          <DeleteProjectButton deleteAction={deleteProject} />
        </div>
      )}

      {!isOwner && user && (
        <div style={{ marginTop: '2rem' }}>
          {existingApplication ? (
            <div>
              <p>Your application status: <strong>{existingApplication.status}</strong></p>
              {existingApplication.status === 'Pending' && (
                <form action={withdrawApplication}>
                  <input type="hidden" name="applicationId" value={existingApplication.id} />
                  <button type="submit" style={{ color: '#c0392b', marginTop: '0.5rem' }}>
                    Withdraw application
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form action={applyToProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                Role applying for
                <select name="role" required style={{ display: 'block', width: '100%', padding: '0.5rem' }}>
                  <option value="">Select role</option>
                  {project.required_roles?.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>

              <label>
                Your name (optional)
                <input name="name" style={{ display: 'block', width: '100%', padding: '0.5rem' }} />
              </label>

              <label>
                Contact details (required — email or phone)
                <input name="contact" required style={{ display: 'block', width: '100%', padding: '0.5rem' }} />
              </label>

              <label>
                Relevant experience / portfolio link
                <input name="experience_link" type="url" placeholder="https://..." style={{ display: 'block', width: '100%', padding: '0.5rem' }} />
              </label>

              <label>
                What do you plan to build or contribute?
                <textarea name="message" required rows={3} placeholder="e.g. I plan to design a dark-mode dashboard with interactive streak charts..." style={{ display: 'block', width: '100%', padding: '0.5rem' }} />
              </label>

              <label>
                Weekly availability
                <select name="availability" required style={{ display: 'block', width: '100%', padding: '0.5rem' }}>
                  <option value="">Select availability</option>
                  <option value="1-5 hrs/week">1–5 hrs/week</option>
                  <option value="5-10 hrs/week">5–10 hrs/week</option>
                  <option value="10+ hrs/week">10+ hrs/week</option>
                </select>
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