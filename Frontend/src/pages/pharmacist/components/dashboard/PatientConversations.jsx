import { usePharmacyData } from '../../hooks/usePharmacyData';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';

export default function PatientConversations() {
  const { conversations, loading, navigateTo, setSelectedConversationId } = usePharmacyData();

  const handleOpenMessenger = () => {
    if (navigateTo) {
      navigateTo('messages');
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">
            Patient Conversations
          </h2>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenMessenger}>
          <Send className="w-3.5 h-3.5" />
          Open Messenger
        </Button>
      </div>

      <div className="space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No active conversations
          </div>
        ) : (
          conversations.slice(0, 5).map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                if (setSelectedConversationId) setSelectedConversationId(chat.id);
                if (navigateTo) navigateTo('messages');
              }}
              className="w-full text-left p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#1A73E8] to-[#1557B0] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {chat.initials}
                  </div>
                  {chat.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {chat.patientName}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {chat.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {chat.lastMessage}
                  </p>
                </div>

                {chat.unread > 0 && (
                  <span className="shrink-0 h-5 px-2 bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {chat.unread} New
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}
