import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useChatConversations, useChatMessages, useSendChatMessage, useUnreadMessageCount, useMarkAllMessagesRead } from '@/hooks/useChat';
import { useStaff } from '@/hooks/useStaff';
import { useAssignments } from '@/hooks/useAssignments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, User, AlertTriangle, Search, Users, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Staff } from '@/types/hospital';

export default function Chat() {
  const { user } = useAuth();
  const { data: conversations } = useChatConversations(user?.id);
  const { data: staff } = useStaff();
  const { data: assignments } = useAssignments({ status: 'active' });
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: messages } = useChatMessages(user?.id, selectedPartnerId || undefined);
  const sendMessage = useSendChatMessage();
  const { data: unreadCount } = useUnreadMessageCount(user?.id);
  const markAllRead = useMarkAllMessagesRead();

  const selectedPartner = staff?.find(s => s.id === selectedPartnerId);

  // Get staff members who share common patients with current user
  const chatableStaff = useMemo(() => {
    if (!staff || !user || !assignments) return [];
    
    // Admin can chat with everyone
    if (user.role === 'admin') {
      return staff.filter(s => 
        s.id !== user.id && 
        (s.role === 'doctor' || s.role === 'nurse') &&
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // For doctors and nurses, find staff who share common patients
    const myAssignments = assignments.filter(a => 
      a.doctor_id === user.id || a.nurse_id === user.id
    );
    
    // Get IDs of staff who share patients with current user
    const sharedStaffIds = new Set<string>();
    const sharedPatients = new Map<string, string[]>(); // staffId -> patientNames
    
    myAssignments.forEach(assignment => {
      // If I'm the doctor, add the nurse
      if (assignment.doctor_id === user.id && assignment.nurse_id) {
        sharedStaffIds.add(assignment.nurse_id);
        const patientName = assignment.patient?.name || 'Unknown';
        const existing = sharedPatients.get(assignment.nurse_id) || [];
        if (!existing.includes(patientName)) {
          sharedPatients.set(assignment.nurse_id, [...existing, patientName]);
        }
      }
      // If I'm the nurse, add the doctor
      if (assignment.nurse_id === user.id && assignment.doctor_id) {
        sharedStaffIds.add(assignment.doctor_id);
        const patientName = assignment.patient?.name || 'Unknown';
        const existing = sharedPatients.get(assignment.doctor_id) || [];
        if (!existing.includes(patientName)) {
          sharedPatients.set(assignment.doctor_id, [...existing, patientName]);
        }
      }
    });
    
    // Filter staff to only those who share patients
    return staff
      .filter(s => 
        s.id !== user.id && 
        sharedStaffIds.has(s.id) &&
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(s => ({
        ...s,
        sharedPatients: sharedPatients.get(s.id) || []
      }));
  }, [staff, user, assignments, searchQuery]) as (Staff & { sharedPatients?: string[] })[];

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPartnerId || !user) return;

    try {
      await sendMessage.mutateAsync({
        sender_id: user.id,
        receiver_id: selectedPartnerId,
        message: newMessage,
        is_urgent: isUrgent
      });
      setNewMessage('');
      setIsUrgent(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">
              {user?.role === 'admin' 
                ? 'Chat with all doctors and nurses'
                : 'Chat with your care team members'}
            </p>
          </div>
          {unreadCount && unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                if (user) {
                  markAllRead.mutate(user.id);
                  toast.success('All messages marked as read');
                }
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All Read ({unreadCount})
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100%-4rem)]">
          {/* Contacts List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {chatableStaff?.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {user?.role === 'admin' 
                          ? 'No staff members found'
                          : 'No team members yet. You can chat with staff who share patients with you.'}
                      </p>
                    </div>
                  ) : (
                    chatableStaff?.map((member) => {
                      const lastConvo = conversations?.find(c => 
                        c.sender_id === member.id || c.receiver_id === member.id
                      );
                      
                      return (
                        <button
                          key={member.id}
                          onClick={() => setSelectedPartnerId(member.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                            selectedPartnerId === member.id 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'hover:bg-muted'
                          )}
                        >
                          <Avatar>
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{member.name}</p>
                              {lastConvo && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(lastConvo.timestamp), 'HH:mm')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {member.role}
                              </Badge>
                              {member.on_duty && (
                                <span className="w-2 h-2 rounded-full bg-success" />
                              )}
                            </div>
                            {member.sharedPatients && member.sharedPatients.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                Patients: {member.sharedPatients.join(', ')}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedPartnerId ? (
              <>
                <CardHeader className="border-b py-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{selectedPartner?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedPartner?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedPartner?.role} • {selectedPartner?.department}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages?.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex flex-col max-w-[70%]',
                            isOwn ? 'ml-auto items-end' : 'items-start'
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-lg px-4 py-2',
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted',
                              msg.is_urgent && 'border-2 border-destructive'
                            )}
                          >
                            {msg.is_urgent && (
                              <div className="flex items-center gap-1 text-xs mb-1 text-destructive">
                                <AlertTriangle className="w-3 h-3" />
                                Urgent
                              </div>
                            )}
                            <p>{msg.message}</p>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                            {msg.read_at && isOwn && ' • Read'}
                          </span>
                        </div>
                      );
                    })}
                    {(!messages || messages.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No messages yet. Start the conversation!
                      </p>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isUrgent ? 'destructive' : 'ghost'}
                      size="icon"
                      onClick={() => setIsUrgent(!isUrgent)}
                      title="Mark as urgent"
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a contact to start chatting</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
