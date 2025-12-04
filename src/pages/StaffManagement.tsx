import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useStaff, useCreateStaff, useUpdateStaff } from '@/hooks/useStaff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, UserCog, Key } from 'lucide-react';
import { toast } from 'sonner';
import type { Staff } from '@/types/hospital';

export default function StaffManagement() {
  const { data: staff, isLoading } = useStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'nurse',
    contact: '',
    department: '',
    specialization: '',
    on_duty: false
  });

  const filteredStaff = staff?.filter(s => roleFilter === 'all' || s.role === roleFilter);

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!editingStaff && (!formData.password || formData.password.length < 6)) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      if (editingStaff) {
        const { password, ...updateData } = formData;
        await updateStaff.mutateAsync({ id: editingStaff.id, ...updateData });
        toast.success('Staff member updated');
      } else {
        await createStaff.mutateAsync(formData);
        toast.success(`Staff member created! They can login with email: ${formData.email}`);
      }
      setShowAddDialog(false);
      setEditingStaff(null);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save staff member');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'nurse',
      contact: '',
      department: '',
      specialization: '',
      on_duty: false
    });
  };

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<Staff | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
      contact: member.contact || '',
      department: member.department || '',
      specialization: member.specialization || '',
      on_duty: member.on_duty
    });
    setShowAddDialog(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordStaff || !newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      // Import hashPassword from localStore
      const store = await import('@/lib/localStore');
      await updateStaff.mutateAsync({ 
        id: resetPasswordStaff.id, 
        password_hash: store.hashPassword(newPassword) 
      });
      toast.success(`Password reset for ${resetPasswordStaff.name}`);
      setShowResetPassword(false);
      setResetPasswordStaff(null);
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const toggleDuty = async (member: Staff) => {
    try {
      await updateStaff.mutateAsync({ id: member.id, on_duty: !member.on_duty });
      toast.success(`${member.name} is now ${!member.on_duty ? 'on duty' : 'off duty'}`);
    } catch (error) {
      toast.error('Failed to update duty status');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">Manage doctors, nurses, and administrators</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingStaff(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
                {!editingStaff && (
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input 
                      type="password" 
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                    <p className="text-xs text-muted-foreground">
                      Staff will use this password to login
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Input value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.on_duty} onCheckedChange={(v) => setFormData({ ...formData, on_duty: v })} />
                  <Label>On Duty</Label>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingStaff ? 'Update' : 'Create'} Staff Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="doctor">Doctor</SelectItem>
              <SelectItem value="nurse">Nurse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === 'admin' ? 'default' : member.role === 'doctor' ? 'secondary' : 'outline'}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{member.department || '-'}</p>
                        {member.specialization && <p className="text-sm text-muted-foreground">{member.specialization}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{member.contact || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={member.on_duty} onCheckedChange={() => toggleDuty(member)} />
                        <span className={member.on_duty ? 'text-success' : 'text-muted-foreground'}>
                          {member.on_duty ? 'On Duty' : 'Off Duty'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(member)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setResetPasswordStaff(member);
                            setShowResetPassword(true);
                          }}
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Reset Password Dialog */}
        <Dialog open={showResetPassword} onOpenChange={(open) => {
          setShowResetPassword(open);
          if (!open) {
            setResetPasswordStaff(null);
            setNewPassword('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reset password for <span className="font-medium">{resetPasswordStaff?.name}</span> ({resetPasswordStaff?.email})
              </p>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
              <Button onClick={handleResetPassword} className="w-full">
                Reset Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
