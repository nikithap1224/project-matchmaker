'use client'

export default function DeleteProjectButton({ deleteAction }) {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!confirm('Delete this project? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      <button className="btn-danger" type="submit" style={{ color: '#c0392b', marginTop: '1rem' }}>
        Delete project
      </button>
    </form>
  )
}