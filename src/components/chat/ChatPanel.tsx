import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatMessages, useSendChatMessage, useRealtimeChat } from '@/hooks/useChat';
import { useStaffMember } from '@/hooks/useStaff';
import { X, Send, AlertTriangle, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  userId: string;
  partnerId: string;
  patientId?: string;
  onClose: () => void;
}

export function ChatPanel({ userId, partnerId, patientId, onClose }: ChatPanelProps) {
  const { data: messages, refetch } = useChatMessages(userId, partnerId, patientId);
  const { data: partner } = useStaffMember(partnerId);
  const sendMessage = useSendChatMessage();
  const [newMessage, setNewMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Enable realtime updates
  useRealtimeChat(userId, partnerId);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Refetch messages periodically
  useEffect(() => {
    const interval = setInterval(() => refetch(), 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessage.mutateAsync({
        sender_id: userId,
        receiver_id: partnerId,
        patient_id: patientId,
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
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] shadow-xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm">{partner?.name || 'Loading...'}</CardTitle>
            <p className="text-xs text-muted-foreground">{partner?.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages?.map((msg) => {
            const isOwn = msg.sender_id === userId;
            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[80%]',
                  isOwn ? 'ml-auto items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
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
                </span>
              </div>
            );
          })}
          {(!messages || messages.length === 0) && (
            <p className="text-center text-muted-foreground text-sm py-8">
              No messages yet. Start the conversation!
            </p>
          )}
        </div>
      </ScrollArea>

      <CardContent className="p-3 border-t">
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
          <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
