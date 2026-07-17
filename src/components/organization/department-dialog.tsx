import { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useOrganization } from '../../providers/organization-provider';
import { Building2, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export function DepartmentDialog() {
  const { departments, areDepartmentsLoading, createDepartment, updateDepartment, deleteDepartment } = useOrganization();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleOpen = () => {
    setOpen(true);
    setEditingId(null);
    setName('');
    setError('');
  };

  const handleEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setName(currentName);
    setError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setName('');
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Department name is required');
      return;
    }

    if (editingId) {
      await updateDepartment.mutateAsync({ id: editingId, name: name.trim(), orgId: '' });
    } else {
      // We can't directly pass orgId via the mutate, but the mutation reads from the provider
      await createDepartment.mutateAsync({ name: name.trim(), orgId: '' });
    }

    handleClose();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      await deleteDepartment.mutateAsync({ id, orgId: '' });
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Plus className="h-4 w-4 mr-1" />
        Add Department
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        title={editingId ? 'Edit Department' : 'Add Department'}
        description="Organize your team into departments for better management"
      >
        <div className="space-y-6 py-2">
          <Input
            label="Department Name"
            placeholder="e.g. Engineering, Marketing, Finance"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            error={error}
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || createDepartment.isPending}>
              {editingId ? 'Update' : 'Create'} Department
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Department List */}
      {!open && (
        <div className="space-y-2 mt-4">
          {areDepartmentsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-surface-800/50 animate-pulse" />
            ))
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-800 mb-3">
                <Building2 className="h-6 w-6 text-surface-500" />
              </div>
              <p className="text-sm font-medium text-surface-300">No departments yet</p>
              <p className="text-xs text-surface-500 mt-1">Create your first department to organize your team.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleOpen}>
                <Plus className="h-4 w-4 mr-1" />
                Create Department
              </Button>
            </div>
          ) : (
            departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between rounded-lg border border-surface-800 px-4 py-3 hover:bg-surface-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-privium-500/10">
                    <Building2 className="h-4 w-4 text-privium-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-200">{dept.name}</p>
                    <p className="text-xs text-surface-500">{dept.head_count} members</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(dept.id, dept.name)}
                    className="rounded-lg p-1.5 text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
                    aria-label="Edit department"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="rounded-lg p-1.5 text-surface-500 hover:text-danger hover:bg-danger/10 transition-colors"
                    aria-label="Delete department"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}