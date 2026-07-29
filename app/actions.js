'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/log';

export async function applyToProject(formData) {
  const supabase = await createClient();

  const projectId = formData.get('project_id');
  const message = formData.get('message');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // 1. Save the application
  const { error: insertError } = await supabase
    .from('applications')
    .insert({ project_id: projectId, applicant_id: user.id, message });

  if (insertError) {
    console.error('Failed to save application:', insertError);
    return { error: insertError.message };
  }

  await logAction(user.id, 'applied_to_project');

  // 2. Look up who to email + what to say
  const { data: project } = await supabase
    .from('projects')
    .select('title, owner_id')
    .eq('id', projectId)
    .single();

  const { data: owner } = await supabase
    .from('users')
    .select('email')
    .eq('id', project.owner_id)
    .single();

  const { data: applicant } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single();

  console.log('owner:', owner);
  console.log('applicant:', applicant);


  // 3. Trigger the notification
  const { error: fnError } = await supabase.functions.invoke('notify-owner', {
    body: {
      ownerEmail: owner.email,
      applicantName: applicant.name,
      projectTitle: project.title,
      pitch: message,
    },
  });

  console.log('fnError:', fnError);

  if (fnError) console.error('Failed to send notification email:', fnError);

  revalidatePath(`/project/${projectId}`);
}